import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { TotpAuthService } from '../totp-auth/totp-auth.service';
import { TotpLoginDto } from '../totp-auth/dto/totp-login.dto';

interface TempTokenPayload {
  sub: number;
  email: string;
  type: string;
  twoFactorPending: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly totpAuthService: TotpAuthService,
  ) {}

  async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
    // Create user using the UsersService
    const user = await this.usersService.create({
      name: registerDto.name,
      surname: registerDto.surname,
      email: registerDto.email,
      password: registerDto.password,
      userType: registerDto.userType,
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Registration successful',
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        userType: user.userType,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);

    // Compare passwords
    const isPasswordValid = await compare(
      loginDto.password,
      user.hashedPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if TOTP is enabled
    if (user.totpEnabled) {
      // Generate temporary token (short-lived, 5 minutes)
      const tempPayload = {
        sub: user.id,
        email: user.email,
        type: 'temp',
        twoFactorPending: true,
      };
      const tempToken = await this.jwtService.signAsync(tempPayload, {
        expiresIn: '5m',
      });

      return {
        success: true,
        message: 'Password verified. Please provide 2FA code.',
        twoFactorRequired: true,
        tempToken,
      };
    }

    // No 2FA required, generate regular JWT token
    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Login successful',
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        userType: user.userType,
      },
    };
  }

  async verifyTotpLogin(totpLoginDto: TotpLoginDto): Promise<LoginResponseDto> {
    try {
      // Verify the temporary token
      const decoded = await this.jwtService.verifyAsync<TempTokenPayload>(
        totpLoginDto.tempToken,
      );

      if (!decoded.twoFactorPending || decoded.type !== 'temp') {
        throw new UnauthorizedException('Invalid temporary token');
      }

      // Verify the TOTP code
      const isValidCode = await this.totpAuthService.verifyTotpCode(
        decoded.sub,
        totpLoginDto.code,
      );

      if (!isValidCode) {
        throw new UnauthorizedException('Invalid 2FA code');
      }

      // Get user info
      const user = await this.usersService.findOne(decoded.sub);

      // Generate final JWT token
      const payload = { sub: user.id, email: user.email };
      const token = await this.jwtService.signAsync(payload);

      return {
        success: true,
        message: 'Login successful',
        access_token: token,
        user: {
          id: user.id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          userType: user.userType,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid 2FA verification');
    }
  }

  async logout(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify token is valid before blacklisting
      await this.jwtService.verifyAsync(token);

      // Add token to blacklist
      this.tokenBlacklistService.addToken(token);

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch {
      // Even if token is invalid, consider logout successful
      return {
        success: true,
        message: 'Logout successful',
      };
    }
  }

  validate(payload: { sub: number; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}

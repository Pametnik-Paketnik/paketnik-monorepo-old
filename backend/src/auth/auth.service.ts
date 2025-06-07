import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './services/token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
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

    // Generate JWT token
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

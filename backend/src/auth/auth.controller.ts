import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { TotpLoginDto } from '../totp-auth/dto/totp-login.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { userId: number };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - passwords do not match',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful or 2FA required',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('2fa/totp/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with TOTP code verification' })
  @ApiResponse({
    status: 200,
    description: 'Login successful after TOTP verification',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid temporary token or TOTP code',
  })
  async verifyTotpLogin(
    @Body() totpLoginDto: TotpLoginDto,
  ): Promise<LoginResponseDto> {
    return this.authService.verifyTotpLogin(totpLoginDto);
  }

  @Post('2fa/face/login')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('face_image'))
  @ApiOperation({ summary: 'Complete login with Face ID verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Temporary token and face image for verification',
    schema: {
      type: 'object',
      properties: {
        tempToken: {
          type: 'string',
          description: 'Temporary token received after password verification',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        face_image: {
          type: 'string',
          format: 'binary',
          description: 'Face image for verification',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful after Face ID verification',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid temporary token or Face ID verification failed',
  })
  async verifyFaceLogin(
    @Body('tempToken') tempToken: string,
    @UploadedFile() faceImage: Express.Multer.File,
  ): Promise<LoginResponseDto> {
    return this.authService.verifyFaceLogin(tempToken, faceImage);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate token' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid token',
  })
  async logout(@Req() req: RequestWithUser): Promise<LogoutResponseDto> {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Remove 'Bearer ' prefix

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    return this.authService.logout(token);
  }
}

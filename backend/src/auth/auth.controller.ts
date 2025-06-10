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
  Get,
  Param,
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
import {
  InitiateFaceAuthDto,
  FaceAuthStatusDto,
} from './dto/face-auth-web.dto';

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

  // NEW WEBSOCKET-ENABLED FACE ID ENDPOINTS

  @Post('2fa/face/login/web')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate WebSocket-based Face ID authentication for web',
    description:
      'Creates a Face ID request and sends push notifications to user devices. The web client should connect to WebSocket to receive real-time updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Face ID request initiated successfully',
    type: FaceAuthStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid temporary token',
  })
  @ApiResponse({
    status: 404,
    description: 'User has no registered devices',
  })
  async initiateFaceAuthWeb(
    @Body() initiateFaceAuthDto: InitiateFaceAuthDto,
    @Req() req: Request,
  ): Promise<FaceAuthStatusDto> {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.authService.initiateFaceAuthWeb(
      initiateFaceAuthDto,
      clientIp,
      userAgent,
    );
  }

  @Post('2fa/face/complete/:requestId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('face_image'))
  @ApiOperation({
    summary: 'Complete Face ID authentication (called by mobile app)',
    description:
      'Mobile app calls this endpoint after face scan with the actual face image for verification.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Face image for verification',
    schema: {
      type: 'object',
      properties: {
        face_image: {
          type: 'string',
          format: 'binary',
          description: 'Face image captured by mobile app for verification',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Face ID authentication completed',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example:
            'Face ID authentication successful. User has been logged in.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request ID or request already completed/expired',
  })
  @ApiResponse({
    status: 401,
    description: 'Face verification failed',
  })
  async completeFaceAuth(
    @Param('requestId') requestId: string,
    @UploadedFile() faceImage: Express.Multer.File,
  ): Promise<{ success: boolean; message: string }> {
    if (!faceImage) {
      throw new UnauthorizedException('Face image is required');
    }

    return this.authService.completeFaceAuth(requestId, faceImage);
  }

  @Get('2fa/face/status/:requestId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Face ID authentication request status',
    description:
      'Check the current status of a Face ID authentication request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Face ID request status retrieved',
    type: FaceAuthStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Face ID request not found',
  })
  async getFaceAuthStatus(
    @Param('requestId') requestId: string,
  ): Promise<FaceAuthStatusDto> {
    return this.authService.getFaceAuthStatus(requestId);
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

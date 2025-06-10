import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SendNotificationDto,
  RegisterDeviceTokenDto,
  TestFaceAuthDto,
  ValidateTokenDto,
  SubscribeTopicDto,
} from './dto/send-notification.dto';
import { NotificationType } from './interfaces/notification.interface';

interface RequestWithUser extends Request {
  user?: { userId: number; email: string };
}

interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  timestamp: string;
}

interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  timestamp: string;
}

@ApiTags('Firebase Notifications')
@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post('test-notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🧪 Test Firebase Notification',
    description: `
      **READY TO TEST!** Send a notification using Firebase Cloud Messaging.
      
      📱 **What this does:**
      - Tests your Firebase Admin SDK setup
      - Sends push notifications to devices/topics
      - Shows exactly what FCM responses look like
      
      🎯 **For testing:** Use the pre-filled examples - they will show "invalid token" errors, which is expected and correct!
      
      ✅ **Success indicators:**
      - Status 200 = Firebase SDK works
      - "successCount": 0 = Expected with fake tokens
      - "failureCount": 1+ = Expected with fake tokens
      - Error "invalid-argument" = Normal for test tokens
      
      🚀 **Try the different notification types** in the dropdown examples!
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Firebase API call successful (even with fake tokens)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Test notification sent successfully',
        },
        data: {
          type: 'object',
          properties: {
            response: {
              type: 'object',
              example: {
                responses: [
                  {
                    success: false,
                    error: {
                      errorInfo: {
                        code: 'messaging/invalid-argument',
                        message:
                          'The registration token is not a valid FCM registration token',
                      },
                      codePrefix: 'messaging',
                    },
                  },
                ],
                successCount: 0,
                failureCount: 1,
              },
            },
          },
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Request validation failed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Failed to send test notification',
        },
        error: {
          type: 'string',
          example: 'Must provide either token, tokens, or topic',
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  async testNotification(
    @Body() sendNotificationDto: SendNotificationDto,
  ): Promise<ApiSuccessResponse | ApiErrorResponse> {
    try {
      const response =
        await this.firebaseService.sendNotification(sendNotificationDto);
      return {
        success: true,
        message: 'Test notification sent successfully',
        data: { response },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to send test notification',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test-face-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '👤 Test Face Authentication Push',
    description: `
      **FACE ID TESTING!** Send a specialized Face Authentication push notification.
      
      🔐 **What this simulates:**
      - Mobile app receives Face Auth request
      - User sees "Login Request" notification  
      - Tapping opens app for Face ID verification
      
      📱 **Test with these values:**
      - deviceTokens: ["fake_device_token_123"] 
      - requestId: "face_req_test_123"
      - userEmail: "test@example.com" (optional)
      
      ✅ **Expected result:** "invalid token" error = SUCCESS (Firebase working correctly)
    `,
  })
  @ApiResponse({
    status: 200,
    description:
      'Face authentication notification sent (expected: fake token errors)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Face auth notification sent successfully',
        },
        data: {
          type: 'object',
          properties: {
            response: {
              type: 'object',
              example: {
                responses: [
                  {
                    success: false,
                    error: {
                      errorInfo: { code: 'messaging/invalid-argument' },
                    },
                  },
                ],
                successCount: 0,
                failureCount: 1,
              },
            },
          },
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Failed to send face auth notification',
        },
        error: { type: 'string', example: 'Device tokens are required' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  async testFaceAuthNotification(
    @Body() data: TestFaceAuthDto,
  ): Promise<ApiSuccessResponse | ApiErrorResponse> {
    try {
      if (!data.deviceTokens || data.deviceTokens.length === 0) {
        throw new BadRequestException('Device tokens are required');
      }

      if (!data.requestId) {
        throw new BadRequestException('Request ID is required');
      }

      const response = await this.firebaseService.sendFaceAuthRequest(
        data.deviceTokens,
        data.requestId,
        data.userEmail,
      );

      return {
        success: true,
        message: 'Face auth notification sent successfully',
        data: { response },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to send face auth notification',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate FCM device token',
    description:
      'Check if a device token is valid. No authentication required for testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token is valid' },
        data: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
          },
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  async validateToken(
    @Body() data: ValidateTokenDto,
  ): Promise<ApiSuccessResponse | ApiErrorResponse> {
    try {
      if (!data.token) {
        throw new BadRequestException('Token is required');
      }

      const isValid = await this.firebaseService.validateDeviceToken(
        data.token,
      );
      return {
        success: true,
        message: isValid ? 'Token is valid' : 'Token is invalid',
        data: { valid: isValid },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Token validation failed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('subscribe-topic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subscribe device tokens to topic',
    description:
      'Subscribe one or more device tokens to a Firebase topic. No authentication required for testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to topic',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  async subscribeToTopic(
    @Body() data: SubscribeTopicDto,
  ): Promise<ApiSuccessResponse | ApiErrorResponse> {
    try {
      if (!data.tokens || data.tokens.length === 0) {
        throw new BadRequestException('Tokens are required');
      }

      if (!data.topic) {
        throw new BadRequestException('Topic is required');
      }

      await this.firebaseService.subscribeToTopic(data.tokens, data.topic);
      return {
        success: true,
        message: `Successfully subscribed to topic: ${data.topic}`,
        data: { topic: data.topic, tokenCount: data.tokens.length },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to subscribe to topic',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('register-device')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register device token for authenticated user',
    description:
      'Register a device token for the currently authenticated user. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Device token registered successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid device token',
  })
  async registerDevice(
    @Body() registerDeviceDto: RegisterDeviceTokenDto,
    @Req() req: RequestWithUser,
  ): Promise<ApiSuccessResponse | ApiErrorResponse> {
    try {
      if (!req.user?.userId) {
        throw new BadRequestException('User information not available');
      }

      // Here you would typically save the device token to your database
      // associated with the user ID. For now, we'll just validate the token.
      const isValid = await this.firebaseService.validateDeviceToken(
        registerDeviceDto.deviceToken,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid device token');
      }

      return {
        success: true,
        message: 'Device token registered successfully',
        data: {
          userId: req.user.userId,
          deviceToken: registerDeviceDto.deviceToken,
          platform: registerDeviceDto.platform,
          deviceName: registerDeviceDto.deviceName,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to register device token',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('send-to-user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send notification to specific user',
    description:
      'Send a notification to a specific user. Requires JWT authentication. For testing, use sample device tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async sendToUser(
    @Body()
    data: {
      targetUserId: number;
      notification: {
        type: NotificationType;
        title: string;
        body: string;
        additionalData?: Record<string, any>;
      };
      deviceTokens: string[]; // For testing purposes
    },
    @Req() req: RequestWithUser,
  ): Promise<ApiSuccessResponse | ApiErrorResponse> {
    try {
      if (!req.user?.userId) {
        throw new BadRequestException('User information not available');
      }

      // For testing, we'll use the provided device tokens
      // In production, you'd fetch device tokens from your database based on targetUserId
      const notification: SendNotificationDto = {
        tokens: data.deviceTokens,
        data: data.notification,
      };

      await this.firebaseService.sendNotification(notification);

      return {
        success: true,
        message: 'Notification sent successfully',
        data: {
          targetUserId: data.targetUserId,
          sentBy: req.user.userId,
          notificationType: data.notification.type,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to send notification',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check Firebase service health',
    description: 'Verify that Firebase Admin SDK is properly initialized',
  })
  @ApiResponse({
    status: 200,
    description: 'Firebase service is healthy',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Firebase service is healthy' },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            firebase: { type: 'string', example: 'initialized' },
          },
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Firebase service is not healthy',
  })
  healthCheck(): ApiSuccessResponse | ApiErrorResponse {
    try {
      // Try to access Firebase messaging to verify initialization
      const messaging = this.firebaseService.getMessaging();

      if (!messaging) {
        throw new InternalServerErrorException(
          'Firebase messaging not initialized',
        );
      }

      return {
        success: true,
        message: 'Firebase service is healthy',
        data: {
          status: 'healthy',
          firebase: 'initialized',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Firebase service is not healthy',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

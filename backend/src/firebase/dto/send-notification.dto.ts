import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../interfaces/notification.interface';

export class NotificationDataDto {
  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: NotificationType.FACE_AUTH_REQUEST,
    examples: {
      face_auth: {
        value: NotificationType.FACE_AUTH_REQUEST,
        description: 'Face authentication request',
      },
      reservation: {
        value: NotificationType.RESERVATION_UPDATE,
        description: 'Reservation status update',
      },
      box_assigned: {
        value: NotificationType.BOX_ASSIGNED,
        description: 'Box assignment notification',
      },
      system: {
        value: NotificationType.SYSTEM_MESSAGE,
        description: 'System message',
      },
    },
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Face Authentication Required',
    examples: {
      face_auth: {
        value: 'Face Authentication Required',
        description: 'Title for face auth request',
      },
      reservation: {
        value: 'Reservation Updated',
        description: 'Title for reservation update',
      },
      box_assigned: {
        value: 'Box Ready for Pickup',
        description: 'Title for box assignment',
      },
      system: {
        value: 'System Maintenance',
        description: 'Title for system message',
      },
    },
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification body message',
    example:
      'Please open the mobile app and verify your identity using Face ID to complete login',
    examples: {
      face_auth: {
        value:
          'Please open the mobile app and verify your identity using Face ID to complete login',
        description: 'Body for face auth request',
      },
      reservation: {
        value: 'Your reservation #1234 status has been updated to: Confirmed',
        description: 'Body for reservation update',
      },
      box_assigned: {
        value:
          'Box #567 at Location A1 is ready for pickup. Tap to view details.',
        description: 'Body for box assignment',
      },
      system: {
        value: 'System maintenance scheduled for tonight 2:00 AM - 4:00 AM',
        description: 'Body for system message',
      },
    },
  })
  @IsString()
  body: string;

  @ApiProperty({
    description:
      'Additional data specific to notification type (auto-filled based on type)',
    examples: {
      face_auth: {
        value: { requestId: 'face_req_123456789', tempToken: 'temp_abc123def' },
        description: 'Data for face auth request',
      },
      reservation: {
        value: { reservationId: 1234, status: 'confirmed' },
        description: 'Data for reservation update',
      },
      box_assigned: {
        value: { boxId: 567, locationId: 'A1' },
        description: 'Data for box assignment',
      },
      system: {
        value: { priority: 'high' },
        description: 'Data for system message',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

export class SendNotificationDto {
  @ApiProperty({
    description: 'Single device token (use this OR tokens, not both)',
    example: 'fake_token_single_device_123',
    examples: {
      test_token: {
        value: 'fake_token_single_device_123',
        description:
          'Test token for single device (will fail with expected error)',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({
    description: 'Multiple device tokens (recommended for testing)',
    example: ['fake_token_device_1', 'fake_token_device_2'],
    examples: {
      test_tokens: {
        value: [
          'fake_token_device_1',
          'fake_token_device_2',
          'fake_token_device_3',
        ],
        description:
          'Test tokens for multiple devices (will fail with expected errors)',
      },
      single_test: {
        value: ['fake_token_for_testing'],
        description: 'Single test token in array format',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tokens?: string[];

  @ApiProperty({
    description:
      'Topic name for topic-based messaging (use this OR tokens/token)',
    example: 'test-topic',
    examples: {
      all_users: {
        value: 'all-users',
        description: 'Topic for all users',
      },
      test_topic: {
        value: 'test-topic',
        description: 'Test topic for development',
      },
      urgent: {
        value: 'urgent-notifications',
        description: 'Topic for urgent notifications',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({
    description: 'Notification data with type-specific information',
    type: NotificationDataDto,
    examples: {
      face_auth_single: {
        value: {
          type: 'face_auth_request',
          title: 'Face Authentication Required',
          body: 'Please open the mobile app and verify your identity using Face ID',
          additionalData: {
            requestId: 'face_req_123456789',
            tempToken: 'temp_abc123def',
          },
        },
        description:
          'Complete face auth notification - USE WITH "token" field (single device)',
      },
      face_auth_multiple: {
        value: {
          type: 'face_auth_request',
          title: 'Face Authentication Required',
          body: 'Please open the mobile app and verify your identity using Face ID',
          additionalData: {
            requestId: 'face_req_123456789',
            tempToken: 'temp_abc123def',
          },
        },
        description:
          'Complete face auth notification - USE WITH "tokens" field (multiple devices)',
      },
      face_auth_topic: {
        value: {
          type: 'face_auth_request',
          title: 'Face Authentication Required',
          body: 'Please open the mobile app and verify your identity using Face ID',
          additionalData: {
            requestId: 'face_req_123456789',
            tempToken: 'temp_abc123def',
          },
        },
        description:
          'Complete face auth notification - USE WITH "topic" field (all topic subscribers)',
      },
      reservation: {
        value: {
          type: 'reservation_update',
          title: 'Reservation Updated',
          body: 'Your reservation #1234 has been confirmed',
          additionalData: { reservationId: 1234, status: 'confirmed' },
        },
        description: 'Reservation update notification',
      },
      box_ready: {
        value: {
          type: 'box_assigned',
          title: 'Box Ready for Pickup',
          body: 'Box #567 at Location A1 is ready for pickup',
          additionalData: { boxId: 567, locationId: 'A1' },
        },
        description: 'Box assignment notification',
      },
      system: {
        value: {
          type: 'system_message',
          title: 'System Maintenance',
          body: 'Scheduled maintenance tonight 2:00 AM - 4:00 AM',
          additionalData: { priority: 'high' },
        },
        description: 'System message notification',
      },
    },
  })
  @ValidateNested()
  @Type(() => NotificationDataDto)
  data: NotificationDataDto;
}

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'FCM device token from mobile app',
    example: 'abc123def456ghi789...',
  })
  @IsString()
  deviceToken: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['android', 'ios'],
    example: 'android',
    required: false,
  })
  @IsOptional()
  @IsString()
  platform?: 'android' | 'ios';

  @ApiProperty({
    description: 'Device name for identification',
    example: "John's iPhone",
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

// New DTOs for testing endpoints

export class TestFaceAuthDto {
  @ApiProperty({
    description: 'Device tokens to send face auth request to',
    example: ['fake_device_token_123', 'fake_device_token_456'],
    examples: {
      single_device: {
        value: ['fake_device_token_123'],
        description: 'Test with single device (will show expected token error)',
      },
      multiple_devices: {
        value: [
          'fake_device_token_123',
          'fake_device_token_456',
          'fake_device_token_789',
        ],
        description:
          'Test with multiple devices (will show expected token errors)',
      },
    },
  })
  @IsArray()
  @IsString({ each: true })
  deviceTokens: string[];

  @ApiProperty({
    description: 'Unique request ID for face authentication',
    example: 'face_req_test_123456',
    examples: {
      test_request: {
        value: 'face_req_test_123456',
        description: 'Test request ID',
      },
      login_request: {
        value: 'login_face_req_20241210_143022',
        description: 'Login face request with timestamp',
      },
    },
  })
  @IsString()
  requestId: string;

  @ApiProperty({
    description: 'User email for context (optional)',
    example: 'test@example.com',
    examples: {
      test_user: {
        value: 'test@example.com',
        description: 'Test user email',
      },
      real_user: {
        value: 'john.doe@company.com',
        description: 'Real user email format',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsString()
  userEmail?: string;
}

export class ValidateTokenDto {
  @ApiProperty({
    description: 'FCM device token to validate',
    example: 'fake_token_for_testing',
    examples: {
      test_token: {
        value: 'fake_token_for_testing',
        description: 'Fake token (will show invalid error - this is correct)',
      },
      another_fake: {
        value: 'invalid_test_token_123',
        description: 'Another fake token for testing',
      },
    },
  })
  @IsString()
  token: string;
}

export class SubscribeTopicDto {
  @ApiProperty({
    description: 'Device tokens to subscribe to topic',
    example: ['fake_token_1', 'fake_token_2'],
    examples: {
      test_devices: {
        value: ['fake_token_1', 'fake_token_2', 'fake_token_3'],
        description: 'Multiple test tokens',
      },
      single_device: {
        value: ['fake_token_for_testing'],
        description: 'Single test token',
      },
    },
  })
  @IsArray()
  @IsString({ each: true })
  tokens: string[];

  @ApiProperty({
    description: 'Topic name to subscribe devices to',
    example: 'test-topic',
    examples: {
      test_topic: {
        value: 'test-topic',
        description: 'General test topic',
      },
      all_users: {
        value: 'all-users',
        description: 'Topic for all users',
      },
      urgent: {
        value: 'urgent-notifications',
        description: 'Topic for urgent notifications',
      },
      face_auth: {
        value: 'face-auth-users',
        description: 'Topic for users with face auth enabled',
      },
    },
  })
  @IsString()
  topic: string;
}

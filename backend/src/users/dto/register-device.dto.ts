import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { DevicePlatform } from '../entities/user-device.entity';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'FCM device token from mobile app',
    example: 'eQg8vZ9X2kM:APA91bHxOzWF7Zx8q1YpABC123def456ghi789...',
    examples: {
      real_android: {
        value:
          'eQg8vZ9X2kM:APA91bHxOzWF7Zx8q1YpABC123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567defghi890',
        description: 'Real Android FCM token (165+ characters)',
      },
      real_ios: {
        value:
          'fRh9wA8Y3lN:APA91bIyPzXG8Ay9r2ZqBCD234efg567hij890klm123nop456qrs789tuv012wxy345zabcd678efghi901',
        description: 'Real iOS FCM token (165+ characters)',
      },
      test_token: {
        value: 'fake_token_for_testing_device_123',
        description: 'Fake token for testing (will show expected error)',
      },
    },
  })
  @IsString()
  @MinLength(10)
  fcmToken: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
    examples: {
      android: {
        value: DevicePlatform.ANDROID,
        description: 'Android device',
      },
      ios: {
        value: DevicePlatform.IOS,
        description: 'iOS device',
      },
      web: {
        value: DevicePlatform.WEB,
        description: 'Web browser (PWA)',
      },
    },
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Device name for identification',
    example: "John's iPhone 14",
    examples: {
      iphone: {
        value: "John's iPhone 14",
        description: 'iOS device name',
      },
      android: {
        value: 'Samsung Galaxy S23',
        description: 'Android device name',
      },
      web: {
        value: 'Chrome on MacBook Pro',
        description: 'Web browser identification',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({
    description: 'Unique device identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'App version',
    example: '1.2.3',
    required: false,
  })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class DeviceResponseDto {
  id: number;
  fcmToken: string;
  platform: DevicePlatform;
  deviceName?: string;
  deviceId?: string;
  appVersion?: string;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateDeviceDto {
  @ApiProperty({
    description: 'Updated device name',
    example: "John's New iPhone",
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({
    description: 'Updated app version',
    example: '1.3.0',
    required: false,
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({
    description: 'Whether device is active',
    example: true,
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}

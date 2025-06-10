import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateFaceAuthDto {
  @ApiProperty({
    description: 'Temporary authentication token from initial login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  tempToken: string;

  @ApiProperty({
    description: 'Request timeout in minutes',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  timeoutMinutes?: number;

  @ApiProperty({
    description: 'Additional device information',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiProperty({
    description: 'Additional metadata for the request',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CompleteFaceAuthDto {
  @ApiProperty({
    description: 'Face ID authentication request ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  requestId: string;

  @ApiProperty({
    description: 'Whether the face authentication was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Failure reason if authentication failed',
    required: false,
  })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiProperty({
    description: 'Additional metadata from the authentication process',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class FaceAuthStatusDto {
  @ApiProperty({
    description: 'Face ID authentication request ID',
  })
  requestId: string;

  @ApiProperty({
    description: 'Current status of the request',
    enum: ['pending', 'completed', 'expired', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'WebSocket room name for real-time updates',
  })
  websocketRoom: string;

  @ApiProperty({
    description: 'Request expiration time',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Number of devices notified',
  })
  devicesNotified: number;
}

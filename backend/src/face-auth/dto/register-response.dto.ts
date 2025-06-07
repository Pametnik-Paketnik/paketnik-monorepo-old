import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    description: 'User ID from JWT token',
    example: '12345',
  })
  user_id: string;

  @ApiProperty({
    description: 'Registration status',
    enum: ['training_started', 'model_already_exists'],
    example: 'training_started',
  })
  status: string;

  @ApiProperty({
    description: 'Number of images received for training',
    example: 60,
  })
  images_received: number;

  @ApiProperty({
    description: 'Human-readable message about the registration',
    example: 'Training started in background. Use /status to check progress.',
  })
  message: string;
} 
import { ApiProperty } from '@nestjs/swagger';

export class StatusResponseDto {
  @ApiProperty({
    description: 'User ID from JWT token',
    example: '12345',
  })
  user_id: string;

  @ApiProperty({
    description: 'Current training status',
    enum: ['training_completed', 'training_in_progress', 'user_not_found'],
    example: 'training_completed',
  })
  status: string;

  @ApiProperty({
    description: 'Whether the model is ready for authentication',
    example: true,
  })
  model_ready: boolean;

  @ApiProperty({
    description: 'Human-readable message about the status',
    example: 'Model training completed successfully. User can now login.',
  })
  message: string;
}

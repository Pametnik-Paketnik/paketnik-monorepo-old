import { ApiProperty } from '@nestjs/swagger';

export class VerifyResponseDto {
  @ApiProperty({
    description: 'User ID from JWT token',
    example: '12345',
  })
  user_id: string;

  @ApiProperty({
    description: 'Whether the user was successfully authenticated',
    example: true,
  })
  authenticated: boolean;

  @ApiProperty({
    description: 'Probability score of the authentication (0.0 to 1.0)',
    example: 0.8742,
    minimum: 0,
    maximum: 1,
  })
  probability: number;
} 
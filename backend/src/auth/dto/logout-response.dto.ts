import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Whether the logout was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the logout result',
    example: 'Logout successful',
  })
  message: string;
}

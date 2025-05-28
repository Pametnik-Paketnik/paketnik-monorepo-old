import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../../users/entities/user.entity';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Whether the login was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the login result',
    example: 'Login successful',
  })
  message: string;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: 1,
      username: 'john_doe',
      userType: 'USER'
    }
  })
  user: {
    id: number;
    username: string;
    userType: UserType;
  };
}

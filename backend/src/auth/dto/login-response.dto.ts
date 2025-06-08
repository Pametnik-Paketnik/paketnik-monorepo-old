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
    description: 'JWT access token (only present when 2FA is not required)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  access_token?: string;

  @ApiProperty({
    description: 'Whether 2FA is required for this user',
    example: false,
    required: false,
  })
  twoFactorRequired?: boolean;

  @ApiProperty({
    description:
      'Temporary token for 2FA verification (only when 2FA is required)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  tempToken?: string;

  @ApiProperty({
    description: 'User information (only present when login is complete)',
    example: {
      id: 1,
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      userType: 'USER',
    },
    required: false,
  })
  user?: {
    id: number;
    name: string;
    surname: string;
    email: string;
    userType: UserType;
  };
}

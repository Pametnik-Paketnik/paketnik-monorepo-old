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
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      userType: 'USER',
    },
  })
  user: {
    id: number;
    name: string;
    surname: string;
    email: string;
    userType: UserType;
  };
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';

export class CreateCleanerDto {
  @ApiProperty({
    description: 'First name of the cleaner',
    example: 'Maria',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Last name of the cleaner',
    example: 'Garcia',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  surname: string;

  @ApiProperty({
    description: 'Email address for the cleaner account',
    example: 'maria.garcia@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the cleaner account',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}

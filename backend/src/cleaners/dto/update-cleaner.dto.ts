import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, IsEmail } from 'class-validator';

export class UpdateCleanerDto {
  @ApiProperty({
    description: 'New first name for the cleaner',
    example: 'Maria',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({
    description: 'New last name for the cleaner',
    example: 'Garcia',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  surname?: string;

  @ApiProperty({
    description: 'New email address for the cleaner account',
    example: 'maria.garcia.updated@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'New password for the cleaner account',
    example: 'newSecurePassword123',
    minLength: 6,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

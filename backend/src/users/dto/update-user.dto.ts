import {
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({
    description: 'The new first name for the user',
    example: 'John',
    minLength: 2,
    required: false,
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'The new last name for the user',
    example: 'Doe',
    minLength: 2,
    required: false,
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  surname?: string;

  @ApiProperty({
    description: 'The new email address for the user',
    example: 'john.doe.updated@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The new password for the user',
    example: 'newpassword123',
    minLength: 8,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({
    description: 'The type of user (USER or HOST)',
    example: 'HOST',
    enum: UserType,
    required: false,
  })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;
}

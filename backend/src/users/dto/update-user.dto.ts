import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({
    description: 'The new username for the user',
    example: 'john_doe_updated',
    minLength: 3,
    required: false,
  })
  @IsString()
  @MinLength(3)
  @IsOptional()
  username?: string;

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

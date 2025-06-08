import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsNumberString } from 'class-validator';

export class VerifyTotpDto {
  @ApiProperty({
    description: 'The 6-digit TOTP code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNumberString()
  @Length(6, 6)
  code: string;
}

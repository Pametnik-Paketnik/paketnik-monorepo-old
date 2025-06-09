import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsNumberString } from 'class-validator';

export class TotpLoginDto {
  @ApiProperty({
    description: 'Temporary token received after password verification',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  tempToken: string;

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

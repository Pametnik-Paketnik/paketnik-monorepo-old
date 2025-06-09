import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FaceLoginDto {
  @ApiProperty({
    description: 'Temporary token received after password verification',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  tempToken: string;
}

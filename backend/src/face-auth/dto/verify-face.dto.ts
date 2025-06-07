import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class VerifyFaceDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Single face image file for authentication',
    example: 'user_selfie.jpg',
  })
  @IsNotEmpty()
  file: Express.Multer.File;
}

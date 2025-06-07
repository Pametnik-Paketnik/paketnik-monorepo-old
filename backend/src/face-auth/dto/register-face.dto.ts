import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class RegisterFaceDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Array of face image files for training (recommended: 20-60 images)',
    minItems: 1,
    example: ['file1.jpg', 'file2.jpg', '...'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one image file is required' })
  @IsNotEmpty()
  files: Express.Multer.File[];
} 
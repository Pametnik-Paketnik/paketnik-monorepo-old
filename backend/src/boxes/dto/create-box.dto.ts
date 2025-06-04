import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateBoxDto {
  @ApiProperty({
    description: 'The unique identifier of the box',
    example: 'BOX123',
  })
  @IsString()
  @IsNotEmpty()
  boxId: string;

  @ApiProperty({
    description: 'The location of the box',
    example: 'Building A, Floor 1',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'The ID of the host who owns this box',
    example: 123,
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsNotEmpty()
  ownerId: number;

  @ApiProperty({
    description: 'Price per night for the box',
    example: 25.99,
    required: true,
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsNotEmpty()
  pricePerNight: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class CheckinReservationDto {
  @ApiProperty({ description: 'ID of the reservation to check in', example: 1 })
  @IsInt()
  @IsNotEmpty()
  reservationId: number;

  @ApiProperty({ 
    description: 'Token format for opening the box', 
    example: 5,
    default: 5,
    required: false,
    minimum: 0,
    maximum: 6
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  tokenFormat?: number = 5;
} 
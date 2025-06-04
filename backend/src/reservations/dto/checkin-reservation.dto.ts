import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CheckinReservationDto {
  @ApiProperty({ description: 'ID of the reservation to check in', example: 1 })
  @IsInt()
  @IsNotEmpty()
  reservationId: number;
}

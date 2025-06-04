import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CancelReservationDto {
  @ApiProperty({
    description: 'ID of the reservation to cancel',
    example: 1,
  })
  @IsNumber()
  reservationId: number;
}

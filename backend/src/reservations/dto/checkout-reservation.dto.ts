import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CheckoutReservationDto {
  @ApiProperty({
    description: 'ID of the reservation to check out',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  reservationId: number;
}

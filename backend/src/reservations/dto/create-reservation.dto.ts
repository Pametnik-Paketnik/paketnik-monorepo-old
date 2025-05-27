import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class CreateReservationDto {
  @ApiProperty({ description: 'ID of the guest user', example: 1 })
  @IsInt()
  @IsNotEmpty()
  guestId: number;

  @ApiProperty({ description: 'ID of the host user', example: 2 })
  @IsInt()
  @IsNotEmpty()
  hostId: number;

  @ApiProperty({ description: 'ID of the box being reserved', example: 1 })
  @IsInt()
  @IsNotEmpty()
  boxId: number;

  @ApiProperty({
    description: 'Check-in date and time in ISO 8601 format',
    example: '2024-05-27T10:00:00.000Z',
    type: String,
  })
  @IsDateString()
  checkinAt: string;

  @ApiProperty({
    description: 'Check-out date and time in ISO 8601 format',
    example: '2024-05-27T18:00:00.000Z',
    type: String,
  })
  @IsDateString()
  checkoutAt: string;

  @ApiProperty({
    description: 'Status of the reservation',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
    example: 'PENDING',
  })
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}

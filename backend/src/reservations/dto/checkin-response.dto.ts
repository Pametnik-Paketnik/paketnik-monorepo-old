import { ApiProperty } from '@nestjs/swagger';

export class CheckinResponseDto {
  @ApiProperty({
    description: 'Whether the checkin was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Checkin confirmation message',
    example: 'Successfully checked in to box 352',
  })
  message: string;

  @ApiProperty({
    description: 'ID of the reservation that was checked in',
    example: 3,
  })
  reservationId: number;

  @ApiProperty({ description: 'ID of the box that was opened', example: '352' })
  boxId: string;

  @ApiProperty({
    description: 'Updated reservation status',
    example: 'CHECKED_IN',
  })
  status: string;

  @ApiProperty({
    description: 'Direct4me token data for box access',
    example: '//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAACrAA',
  })
  data: string;
}

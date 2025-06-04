import { ApiProperty } from '@nestjs/swagger';

export class CheckoutResponseDto {
  @ApiProperty({
    description: 'Whether the checkout was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Checkout confirmation message',
    example: 'Successfully checked out from box 352',
  })
  message: string;

  @ApiProperty({
    description: 'ID of the reservation that was checked out',
    example: 3,
  })
  reservationId: number;

  @ApiProperty({ description: 'ID of the box that was opened', example: '352' })
  boxId: string;

  @ApiProperty({
    description: 'Updated reservation status',
    example: 'CHECKED_OUT',
  })
  status: string;

  @ApiProperty({
    description: 'Direct4me token data for box access',
    example: '//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAACrAA',
  })
  data: string;
}

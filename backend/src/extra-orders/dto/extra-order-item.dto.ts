import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

export class ExtraOrderItemDto {
  @ApiProperty({
    description: 'ID of the inventory item to order',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  inventoryItemId: number;

  @ApiProperty({
    description: 'Quantity of the item to order',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
}

import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ExtraOrderItemDto } from './extra-order-item.dto';

export class CreateExtraOrderDto {
  @ApiProperty({
    description: 'ID of the reservation for which the order is placed',
    example: 123,
  })
  @IsNumber()
  reservationId: number;

  @ApiProperty({
    description: 'Array of items to order',
    type: [ExtraOrderItemDto],
    example: [
      { inventoryItemId: 1, quantity: 2 },
      { inventoryItemId: 3, quantity: 1 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraOrderItemDto)
  @ArrayMinSize(1)
  items: ExtraOrderItemDto[];

  @ApiProperty({
    description: 'Optional notes for the entire order',
    example: 'Please deliver between 2-4 PM',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

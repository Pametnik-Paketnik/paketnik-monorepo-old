import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateExtraOrderDto {
  @IsNumber()
  reservationId: number;

  @IsNumber()
  inventoryItemId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

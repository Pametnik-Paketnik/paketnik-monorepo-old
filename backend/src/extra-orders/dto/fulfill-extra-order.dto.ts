import { IsOptional, IsString } from 'class-validator';

export class FulfillExtraOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

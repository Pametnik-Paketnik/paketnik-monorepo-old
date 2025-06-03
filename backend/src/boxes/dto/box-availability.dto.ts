import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class BoxAvailabilityDto {
  @ApiProperty({
    description: 'Start date for availability check',
    example: '2024-05-27T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date for availability check',
    example: '2024-05-28T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

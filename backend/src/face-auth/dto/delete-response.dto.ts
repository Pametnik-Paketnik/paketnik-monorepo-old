import { ApiProperty } from '@nestjs/swagger';

export class DeleteResponseDto {
  @ApiProperty({
    description: 'User ID from JWT token',
    example: '12345',
  })
  user_id: string;

  @ApiProperty({
    description: 'Deletion status',
    enum: ['deleted', 'not_found'],
    example: 'deleted',
  })
  status: string;

  @ApiProperty({
    description: 'Whether the model was deleted from storage',
    example: true,
  })
  model_deleted: boolean;

  @ApiProperty({
    description: 'Whether local data was deleted',
    example: true,
  })
  local_data_deleted: boolean;

  @ApiProperty({
    description: 'Human-readable message about the deletion',
    example: 'User data deleted successfully.',
  })
  message: string;
}

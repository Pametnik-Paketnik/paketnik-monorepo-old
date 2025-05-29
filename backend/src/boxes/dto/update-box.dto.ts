import { PartialType } from '@nestjs/swagger';
import { CreateBoxDto } from './create-box.dto';

export class UpdateBoxDto extends PartialType(CreateBoxDto) {
  // All properties from CreateBoxDto are inherited and made optional
  // No need to add additional properties as they are all optional in the base DTO
}

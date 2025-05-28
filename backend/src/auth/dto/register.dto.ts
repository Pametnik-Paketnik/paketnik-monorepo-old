import { CreateUserDto } from '../../users/dto/create-user.dto';

export class RegisterDto extends CreateUserDto {
  // No additional properties needed - inherits username, password, and userType from CreateUserDto
}

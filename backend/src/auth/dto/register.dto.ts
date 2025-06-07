import { CreateUserDto } from '../../users/dto/create-user.dto';

export class RegisterDto extends CreateUserDto {
  // No additional properties needed - inherits name, surname, email, password, and userType from CreateUserDto
}

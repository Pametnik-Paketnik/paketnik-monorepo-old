import { UserType } from '../entities/user.entity';

export class UserResponseDto {
  id: number;
  name: string;
  surname: string;
  email: string;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
}

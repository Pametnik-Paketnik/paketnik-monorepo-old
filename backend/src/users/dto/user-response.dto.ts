import { UserType } from '../entities/user.entity';

export class UserResponseDto {
  id: number;
  username: string;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
}

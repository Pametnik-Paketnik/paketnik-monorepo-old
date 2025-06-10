import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserDevicesService } from './user-devices.service';
import { User } from './entities/user.entity';
import { UserDevice } from './entities/user-device.entity';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([User, UserDevice]),
    FirebaseModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserDevicesService],
  exports: [UsersService, UserDevicesService],
})
export class UsersModule {}

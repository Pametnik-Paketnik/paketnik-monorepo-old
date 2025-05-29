import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Box } from '../boxes/entities/box.entity';
import { User } from '../users/entities/user.entity';
import { BoxesModule } from '../boxes/boxes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Box, User]),
    BoxesModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}

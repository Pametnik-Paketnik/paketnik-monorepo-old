import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxesService } from './boxes.service';
import { BoxesController } from './boxes.controller';
import { Box } from './entities/box.entity';
import { HttpModule } from '@nestjs/axios';
import { UnlockHistory } from './entities/unlock-history.entity';
import { UsersModule } from '../users/users.module';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Box, UnlockHistory, Reservation]),
    HttpModule,
  ],
  controllers: [BoxesController],
  providers: [BoxesService],
  exports: [BoxesService],
})
export class BoxesModule {}

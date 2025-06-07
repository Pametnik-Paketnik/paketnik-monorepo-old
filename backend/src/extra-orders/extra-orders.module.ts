import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtraOrdersService } from './extra-orders.service';
import { ExtraOrdersController } from './extra-orders.controller';
import { ExtraOrder } from './entities/extra-order.entity';
import { ExtraOrderItem } from './entities/extra-order-item.entity';
import { User } from '../users/entities/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExtraOrder,
      ExtraOrderItem,
      User,
      Reservation,
      InventoryItem,
    ]),
  ],
  controllers: [ExtraOrdersController],
  providers: [ExtraOrdersService],
  exports: [ExtraOrdersService],
})
export class ExtraOrdersModule {}

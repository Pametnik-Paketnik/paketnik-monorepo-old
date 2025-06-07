import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity';

export enum ExtraOrderStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

@Entity('extra_orders')
export class ExtraOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @ManyToOne(() => InventoryItem, (item) => item.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem: InventoryItem;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: ExtraOrderStatus,
    default: ExtraOrderStatus.PENDING,
  })
  status: ExtraOrderStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'fulfilled_by_id' })
  fulfilledBy: User;

  @Column({ type: 'timestamptz', nullable: true })
  fulfilledAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

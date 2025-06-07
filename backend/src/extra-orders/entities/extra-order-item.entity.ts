import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExtraOrder } from './extra-order.entity';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity';

@Entity('extra_order_items')
export class ExtraOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ExtraOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extra_order_id' })
  extraOrder: ExtraOrder;

  @ManyToOne(() => InventoryItem, (item) => item.orderItems, {
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

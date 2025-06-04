import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Box } from '../../boxes/entities/box.entity';

export enum ReservationStatus {
  PENDING = 'PENDING',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => User) @JoinColumn({ name: 'guest_id' }) guest: User;
  @ManyToOne(() => User) @JoinColumn({ name: 'host_id' }) host: User;
  @ManyToOne(() => Box) @JoinColumn({ name: 'box_id' }) box: Box;
  @Column({ type: 'timestamptz' }) checkinAt: Date;
  @Column({ type: 'timestamptz' }) checkoutAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) actualCheckinAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) actualCheckoutAt: Date;
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number;
}

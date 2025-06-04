import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { BoxImage } from './box-image.entity';
import { Exclude } from 'class-transformer';

@Entity('boxes')
export class Box {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @Column({ name: 'box_id', unique: true }) boxId: string;
  @Column() location: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;
  @OneToMany(() => Reservation, (r) => r.box) reservations: Reservation[];
  @OneToMany(() => BoxImage, (image) => image.box) images: BoxImage[];
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerNight: number;
}

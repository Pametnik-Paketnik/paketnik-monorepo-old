import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

@Entity('user_devices')
@Index(['userId', 'fcmToken'], { unique: true }) // Prevent duplicate tokens per user
export class UserDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'fcm_token', type: 'text' })
  fcmToken: string;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    default: DevicePlatform.ANDROID,
  })
  platform: DevicePlatform;

  @Column({ name: 'device_name', nullable: true })
  deviceName?: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @Column({ name: 'app_version', nullable: true })
  appVersion?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

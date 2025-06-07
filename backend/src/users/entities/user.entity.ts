import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserType {
  USER = 'USER',
  HOST = 'HOST',
  CLEANER = 'CLEANER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'hashed_password' })
  @Exclude()
  hashedPassword: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.USER,
    name: 'user_type',
  })
  userType: UserType;

  // Relationship: Each cleaner belongs to exactly one host
  @ManyToOne(() => User, (user) => user.cleaners, { nullable: true })
  @JoinColumn({ name: 'host_id' })
  host: User;

  // Relationship: Each host can have multiple cleaners
  @OneToMany(() => User, (user) => user.host)
  cleaners: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Box } from './box.entity';
import { Exclude } from 'class-transformer';

@Entity('box_images')
export class BoxImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_key' })
  imageKey: string; // MinIO object key

  @Column({ name: 'file_name' })
  fileName: string; // Original filename

  @Column({ name: 'mime_type' })
  mimeType: string; // e.g., 'image/jpeg', 'image/png'

  @Column({ name: 'file_size' })
  fileSize: number; // File size in bytes

  @Column({ name: 'image_url' })
  imageUrl: string; // Public URL to access the image

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean; // Indicates if this is the main/cover image

  @ManyToOne(() => Box, (box) => box.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'box_id' })
  @Exclude()
  box: Box;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MediaType } from '@fixme/shared-types';
import { RepairRequestEntity } from './repair-request.entity';

@Entity('problem_request_media')
export class RepairRequestMediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => RepairRequestEntity, (r) => r.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: RepairRequestEntity;

  @Index()
  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @Column({ type: 'enum', enum: MediaType, default: MediaType.PHOTO })
  type!: MediaType;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey!: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 500, nullable: true })
  originalFilename!: string | null;

  // Compatibility getter/setter
  get originalName(): string | null {
    return this.originalFilename;
  }
  set originalName(val: string | null) {
    this.originalFilename = val;
  }

  @Column({ name: 'mime_type', type: 'varchar', length: 100, default: 'image/jpeg' })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'bigint', default: 0 })
  sizeBytes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

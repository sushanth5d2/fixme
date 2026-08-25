import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity('message_attachments')
export class MessageAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MessageEntity, (m) => m.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message!: MessageEntity;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({ type: 'varchar', length: 500 })
  filename!: string;

  get originalName(): string {
    return this.filename;
  }
  set originalName(val: string) {
    this.filename = val;
  }

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

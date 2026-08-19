import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { RequestStatus, UrgencyLevel } from '@fixme/shared-types';
import { CustomerEntity } from '../customers/customer.entity';
import { AddressEntity } from '../customers/address.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';
import { RepairRequestMediaEntity } from './repair-request-media.entity';

@Entity('problem_requests')
export class RepairRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CustomerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => DeviceCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category!: DeviceCategoryEntity;

  @Index()
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => DeviceBrandEntity, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand!: DeviceBrandEntity | null;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId!: string | null;

  @Column({ name: 'device_model', type: 'varchar', length: 200, nullable: true })
  deviceModel!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.OPEN,
  })
  @Index()
  status!: RequestStatus;

  @Column({ type: 'enum', enum: UrgencyLevel, default: UrgencyLevel.MEDIUM })
  priority!: UrgencyLevel;

  @ManyToOne(() => AddressEntity, { nullable: true })
  @JoinColumn({ name: 'address_id' })
  address!: AddressEntity | null;

  @Column({ name: 'address_id', type: 'uuid', nullable: true })
  addressId!: string | null;

  @Column({ name: 'address_snapshot', type: 'jsonb', nullable: true })
  addressSnapshot!: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ name: 'preferred_date', type: 'date', nullable: true })
  preferredDate!: string | null;

  @Column({ name: 'preferred_time_slot', type: 'varchar', length: 50, nullable: true })
  preferredTimeSlot!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @OneToMany(() => RepairRequestMediaEntity, (m) => m.request)
  media!: RepairRequestMediaEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

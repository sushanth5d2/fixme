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

  @Column({ name: 'problem_title', type: 'varchar', length: 500, default: '' })
  problemTitle!: string;

  @Column({ name: 'problem_description', type: 'text' })
  problemDescription!: string;

  // Compatibility getter/setter for description
  get description(): string {
    return this.problemDescription;
  }
  set description(val: string) {
    this.problemDescription = val;
  }

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.OPEN,
  })
  @Index()
  status!: RequestStatus;

  @Column({
    name: 'urgency',
    type: 'enum',
    enum: UrgencyLevel,
    default: UrgencyLevel.MEDIUM,
  })
  urgency!: UrgencyLevel;

  // Compatibility getter/setter for priority
  get priority(): UrgencyLevel {
    return this.urgency;
  }
  set priority(val: UrgencyLevel) {
    this.urgency = val;
  }

  @Column({ name: 'warranty_status', type: 'boolean', default: false })
  warrantyStatus!: boolean;

  @ManyToOne(() => AddressEntity, { nullable: true })
  @JoinColumn({ name: 'address_id' })
  address!: AddressEntity | null;

  @Column({ name: 'address_id', type: 'uuid', nullable: true })
  addressId!: string | null;

  @Column({ name: 'house_building', type: 'varchar', length: 255, nullable: true })
  houseBuilding!: string | null;

  @Column({ name: 'street', type: 'varchar', length: 255, nullable: true })
  street!: string | null;

  @Column({ name: 'area', type: 'varchar', length: 255, nullable: true })
  area!: string | null;

  @Column({ name: 'landmark', type: 'varchar', length: 255, nullable: true })
  landmark!: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, default: 'Bengaluru' })
  city!: string;

  @Column({ name: 'state', type: 'varchar', length: 100, default: 'Karnataka' })
  state!: string;

  @Column({ name: 'pincode', type: 'varchar', length: 6, default: '560001' })
  pincode!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ name: 'preferred_date', type: 'date', nullable: true })
  preferredDate!: string | null;

  @Column({ name: 'preferred_time', type: 'time', nullable: true })
  preferredTime!: string | null;

  @OneToMany(() => RepairRequestMediaEntity, (m) => m.request)
  media!: RepairRequestMediaEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { FixerEntity } from './fixer.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';

@Entity('fixer_services')
@Unique('fixer_services_unique', ['fixerId', 'categoryId', 'brandId'])
export class FixerServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FixerEntity, (f) => f.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fixer_id' })
  fixer!: FixerEntity;

  @Index()
  @Column({ name: 'fixer_id', type: 'uuid' })
  fixerId!: string;

  @ManyToOne(() => DeviceCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category!: DeviceCategoryEntity;

  @Index()
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => DeviceBrandEntity, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand!: DeviceBrandEntity | null;

  @Index()
  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

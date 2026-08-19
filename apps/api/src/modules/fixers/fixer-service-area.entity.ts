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
import { ServiceAreaType } from '@fixme/shared-types';
import { FixerEntity } from './fixer.entity';

@Entity('fixer_service_areas')
export class FixerServiceAreaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FixerEntity, (f) => f.serviceAreas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fixer_id' })
  fixer!: FixerEntity;

  @Index()
  @Column({ name: 'fixer_id' })
  fixerId!: string;

  @Column({ type: 'enum', enum: ServiceAreaType })
  type!: ServiceAreaType;

  @Index()
  @Column({ length: 6, nullable: true })
  pincode!: string | null;

  @Index()
  @Column({ length: 100, nullable: true })
  city!: string | null;

  @Column({ length: 100, nullable: true })
  state!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ name: 'radius_km', type: 'decimal', precision: 6, scale: 2, nullable: true })
  radiusKm!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

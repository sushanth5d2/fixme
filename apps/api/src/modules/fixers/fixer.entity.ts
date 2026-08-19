import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { FixerVerificationStatus } from '@fixme/shared-types';
import { UserEntity } from '../users/user.entity';
import { FixerDocumentEntity } from './fixer-document.entity';
import { FixerServiceEntity } from './fixer-service.entity';
import { FixerServiceAreaEntity } from './fixer-service-area.entity';

@Entity('fixers')
export class FixerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'owner_name', length: 200 })
  ownerName!: string;

  @Index()
  @Column({ name: 'company_name', length: 200 })
  companyName!: string;

  @Column({ length: 15, nullable: true, unique: true })
  gstin!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'profile_photo_key', length: 512, nullable: true })
  profilePhotoKey!: string | null;

  @Column({ name: 'experience_years', type: 'smallint', default: 0 })
  experienceYears!: number;

  @Column({ name: 'emergency_service', default: false })
  emergencyService!: boolean;

  @Column({ name: 'working_hours_start', type: 'time', nullable: true })
  workingHoursStart!: string | null;

  @Column({ name: 'working_hours_end', type: 'time', nullable: true })
  workingHoursEnd!: string | null;

  @Column({ name: 'working_days', type: 'text', array: true, default: [] })
  workingDays!: string[];

  @Index()
  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: FixerVerificationStatus,
    default: FixerVerificationStatus.REGISTERED,
  })
  verificationStatus!: FixerVerificationStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews!: number;

  @Column({ name: 'completed_jobs', default: 0 })
  completedJobs!: number;

  @Column({ name: 'response_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  responseRate!: number;

  // Business address
  @Column({ name: 'address_line', length: 500 })
  addressLine!: string;

  @Index()
  @Column({ length: 100 })
  city!: string;

  @Column({ length: 100 })
  state!: string;

  @Index()
  @Column({ length: 6 })
  pincode!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @OneToMany(() => FixerDocumentEntity, (d) => d.fixer)
  documents!: FixerDocumentEntity[];

  @OneToMany(() => FixerServiceEntity, (s) => s.fixer)
  services!: FixerServiceEntity[];

  @OneToMany(() => FixerServiceAreaEntity, (a) => a.fixer)
  serviceAreas!: FixerServiceAreaEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

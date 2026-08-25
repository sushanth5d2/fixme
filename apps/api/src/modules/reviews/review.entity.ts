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
import { ReviewStatus } from '@fixme/shared-types';
import { JobEntity } from '../jobs/job.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { FixerEntity } from '../fixers/fixer.entity';

@Entity('reviews')
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => JobEntity)
  @JoinColumn({ name: 'job_id' })
  job!: JobEntity;

  @Index({ unique: true })
  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => FixerEntity)
  @JoinColumn({ name: 'fixer_id' })
  fixer!: FixerEntity;

  @Index()
  @Column({ name: 'fixer_id', type: 'uuid' })
  fixerId!: string;

  @Column({ name: 'overall_rating', type: 'smallint' })
  overallRating!: number;

  get rating(): number {
    return this.overallRating;
  }
  set rating(val: number) {
    this.overallRating = val;
  }

  @Column({ name: 'service_quality', type: 'smallint', default: 5 })
  serviceQuality!: number;

  @Column({ name: 'communication', type: 'smallint', default: 5 })
  communication!: number;

  @Column({ name: 'pricing', type: 'smallint', default: 5 })
  pricing!: number;

  @Column({ name: 'timeliness', type: 'smallint', default: 5 })
  timeliness!: number;

  @Column({ name: 'professionalism', type: 'smallint', default: 5 })
  professionalism!: number;

  @Column({ name: 'review_text', type: 'text', nullable: true })
  reviewText!: string | null;

  get comment(): string | null {
    return this.reviewText;
  }
  set comment(val: string | null) {
    this.reviewText = val;
  }

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.VISIBLE,
  })
  status!: ReviewStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

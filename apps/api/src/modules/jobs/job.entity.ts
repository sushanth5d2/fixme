import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { JobStatus } from '@fixme/shared-types';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { QuoteEntity } from '../quotes/quote.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { JobStatusHistoryEntity } from './job-status-history.entity';

@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => RepairRequestEntity)
  @JoinColumn({ name: 'request_id' })
  request!: RepairRequestEntity;

  @Index()
  @Column({ name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => QuoteEntity)
  @JoinColumn({ name: 'quote_id' })
  quote!: QuoteEntity;

  @Column({ name: 'quote_id' })
  quoteId!: string;

  @ManyToOne(() => FixerEntity)
  @JoinColumn({ name: 'fixer_id' })
  fixer!: FixerEntity;

  @Index()
  @Column({ name: 'fixer_id' })
  fixerId!: string;

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Index()
  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.ASSIGNED,
  })
  @Index()
  status!: JobStatus;

  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate!: string | null;

  @Column({ name: 'scheduled_time_slot', length: 50, nullable: true })
  scheduledTimeSlot!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ name: 'fixer_notes', type: 'text', nullable: true })
  fixerNotes!: string | null;

  @OneToMany(() => JobStatusHistoryEntity, (h) => h.job)
  statusHistory!: JobStatusHistoryEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

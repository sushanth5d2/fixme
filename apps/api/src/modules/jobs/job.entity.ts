import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { JobStatus, QuoteRevisionStatus } from '@fixme/shared-types';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { QuoteEntity } from '../quotes/quote.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { FixerMemberEntity } from '../fixers/fixer-member.entity';
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
  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @ManyToOne(() => QuoteEntity)
  @JoinColumn({ name: 'quote_id' })
  quote!: QuoteEntity;

  @Column({ name: 'quote_id', type: 'uuid' })
  quoteId!: string;

  @ManyToOne(() => FixerEntity)
  @JoinColumn({ name: 'fixer_id' })
  fixer!: FixerEntity;

  @Index()
  @Column({ name: 'fixer_id', type: 'uuid' })
  fixerId!: string;

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => FixerMemberEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_member_id' })
  assignedMember!: FixerMemberEntity | null;

  @Index()
  @Column({ name: 'assigned_member_id', type: 'uuid', nullable: true })
  assignedMemberId!: string | null;

  @Column({
    name: 'revision_status',
    type: 'enum',
    enum: QuoteRevisionStatus,
    default: QuoteRevisionStatus.NONE,
  })
  revisionStatus!: QuoteRevisionStatus;

  @Column({ name: 'revised_total', type: 'decimal', precision: 10, scale: 2, nullable: true })
  revisedTotal!: number | null;

  @Column({ name: 'revision_notes', type: 'text', nullable: true })
  revisionNotes!: string | null;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.ASSIGNED,
  })
  @Index()
  status!: JobStatus;

  @Column({ name: 'agreed_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  agreedTotal!: number;

  @Column({ name: 'warranty_days', type: 'smallint', default: 0 })
  warrantyDays!: number;

  @Column({ name: 'warranty_expires_at', type: 'date', nullable: true })
  warrantyExpiresAt!: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null;

  // Compatibility getter/setter for scheduledDate
  get scheduledDate(): string | null {
    return this.scheduledAt ? this.scheduledAt.toISOString().split('T')[0] : null;
  }
  set scheduledDate(val: string | null) {
    if (val) this.scheduledAt = new Date(val);
  }

  get scheduledTimeSlot(): string | null {
    return null;
  }
  set scheduledTimeSlot(_val: string | null) {}

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  get fixerNotes(): string | null {
    return null;
  }
  set fixerNotes(_val: string | null) {}

  @OneToMany(() => JobStatusHistoryEntity, (h) => h.job)
  statusHistory!: JobStatusHistoryEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

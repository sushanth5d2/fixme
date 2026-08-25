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
import { QuoteStatus } from '@fixme/shared-types';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { FixerEntity } from '../fixers/fixer.entity';

@Entity('quotes')
export class QuoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => RepairRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: RepairRequestEntity;

  @Index()
  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @ManyToOne(() => FixerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fixer_id' })
  fixer!: FixerEntity;

  @Index()
  @Column({ name: 'fixer_id', type: 'uuid' })
  fixerId!: string;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.SUBMITTED,
  })
  @Index()
  status!: QuoteStatus;

  @Column({ name: 'estimated_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimatedTotal!: number;

  // Compatibility getter/setter for amount
  get amount(): number {
    return this.estimatedTotal;
  }
  set amount(val: number) {
    this.estimatedTotal = val;
  }

  @Column({ name: 'inspection_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  inspectionFee!: number | null;

  @Column({ name: 'labor_charge', type: 'decimal', precision: 10, scale: 2, nullable: true })
  laborCharge!: number | null;

  @Column({ name: 'spare_parts_estimate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sparePartsEstimate!: number | null;

  @Column({ name: 'estimated_completion_days', type: 'smallint', default: 1 })
  estimatedCompletionDays!: number;

  // Compatibility getter/setter
  get estimatedDurationHours(): number | null {
    return this.estimatedCompletionDays ? this.estimatedCompletionDays * 24 : null;
  }
  set estimatedDurationHours(val: number | null) {
    this.estimatedCompletionDays = val ? Math.max(1, Math.ceil(val / 24)) : 1;
  }

  @Column({ name: 'warranty_days', type: 'smallint', default: 0 })
  warrantyDays!: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  // Compatibility getter/setter for diagnosisNotes
  get diagnosisNotes(): string | null {
    return this.notes;
  }
  set diagnosisNotes(val: string | null) {
    this.notes = val;
  }

  customerNotes?: string | null;

  @Column({ name: 'valid_until', type: 'date', default: () => "CURRENT_DATE + INTERVAL '7 days'" })
  validUntil!: string;

  @Column({ name: 'submitted_at', type: 'timestamptz', default: () => 'NOW()' })
  submittedAt!: Date;

  @Column({ name: 'viewed_at', type: 'timestamptz', nullable: true })
  viewedAt!: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({ name: 'withdrawn_at', type: 'timestamptz', nullable: true })
  withdrawnAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

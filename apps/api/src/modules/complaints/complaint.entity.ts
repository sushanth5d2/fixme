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
import { ComplaintStatus, ComplaintReason } from '@fixme/shared-types';
import { UserEntity } from '../users/user.entity';
import { JobEntity } from '../jobs/job.entity';

@Entity('complaints')
export class ComplaintEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => JobEntity)
  @JoinColumn({ name: 'job_id' })
  job!: JobEntity;

  @Index()
  @Column({ name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'complainant_id' })
  complainant!: UserEntity;

  @Index()
  @Column({ name: 'complainant_id' })
  complainantId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'respondent_id' })
  respondent!: UserEntity;

  @Column({ name: 'respondent_id' })
  respondentId!: string;

  @Column({ type: 'enum', enum: ComplaintReason })
  reason!: ComplaintReason;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.OPEN,
  })
  @Index()
  status!: ComplaintStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy!: UserEntity | null;

  @Column({ name: 'resolved_by_id', nullable: true })
  resolvedById!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

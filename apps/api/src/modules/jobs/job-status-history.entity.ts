import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { JobStatus } from '@fixme/shared-types';
import { JobEntity } from './job.entity';

@Entity('job_status_history')
export class JobStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => JobEntity, (j) => j.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: JobEntity;

  @Index()
  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @Column({ name: 'from_status', type: 'enum', enum: JobStatus, nullable: true })
  fromStatus!: JobStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: JobStatus })
  toStatus!: JobStatus;

  @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
  changedByUserId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

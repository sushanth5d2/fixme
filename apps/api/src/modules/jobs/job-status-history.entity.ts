import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { JobStatus, UserRole } from '@fixme/shared-types';
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

  @Column({ name: 'previous_status', type: 'enum', enum: JobStatus, nullable: true })
  previousStatus!: JobStatus | null;

  @Column({ name: 'new_status', type: 'enum', enum: JobStatus })
  newStatus!: JobStatus;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ name: 'actor_role', type: 'enum', enum: UserRole, default: UserRole.FIXER })
  actorRole!: UserRole;

  @Column({ name: 'note', type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Backward compatibility getters / setters
  get fromStatus(): JobStatus | null {
    return this.previousStatus;
  }
  set fromStatus(val: JobStatus | null) {
    this.previousStatus = val;
  }

  get toStatus(): JobStatus {
    return this.newStatus;
  }
  set toStatus(val: JobStatus) {
    this.newStatus = val;
  }

  get changedByUserId(): string | null {
    return this.actorId;
  }
  set changedByUserId(val: string | null) {
    this.actorId = val;
  }

  get notes(): string | null {
    return this.note;
  }
  set notes(val: string | null) {
    this.note = val;
  }
}

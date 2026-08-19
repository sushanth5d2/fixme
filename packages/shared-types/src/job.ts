import { JobStatus } from './enums';
import { Timestamps } from './common';

export interface Job extends Timestamps {
  id: string;
  requestId: string;
  quoteId: string;
  customerId: string;
  fixerId: string;
  status: JobStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  // From accepted quote
  agreedTotal: number;
  warrantyDays: number;
  warrantyExpiresAt: string | null;
  deletedAt: string | null;
}

export interface JobStatusHistory extends Timestamps {
  id: string;
  jobId: string;
  previousStatus: JobStatus | null;
  newStatus: JobStatus;
  actorId: string;
  actorRole: string;
  note: string | null;
}

export interface UpdateJobStatusDto {
  status: JobStatus;
  note?: string;
}

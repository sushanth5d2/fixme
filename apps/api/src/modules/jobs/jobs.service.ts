import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  JobStatus,
  QuoteStatus,
  UserRole,
  RequestStatus,
  QuoteRevisionStatus,
} from '@fixme/shared-types';
import { JobEntity } from './job.entity';
import { JobStatusHistoryEntity } from './job-status-history.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { FixerMemberEntity } from '../fixers/fixer-member.entity';
import { QuoteEntity } from '../quotes/quote.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { UpdateJobStatusDto, CancelJobDto, ScheduleJobDto } from './dto/job.dto';

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.ASSIGNED]: [JobStatus.FIXER_ON_THE_WAY, JobStatus.CANCELLED],
  [JobStatus.FIXER_ON_THE_WAY]: [JobStatus.DEVICE_RECEIVED, JobStatus.CANCELLED],
  [JobStatus.DEVICE_RECEIVED]: [JobStatus.DIAGNOSING],
  [JobStatus.DIAGNOSING]: [JobStatus.REPAIR_IN_PROGRESS],
  [JobStatus.REPAIR_IN_PROGRESS]: [JobStatus.READY_FOR_DELIVERY],
  [JobStatus.READY_FOR_DELIVERY]: [JobStatus.COMPLETED],
  [JobStatus.COMPLETED]: [],
  [JobStatus.CANCELLED]: [],
  [JobStatus.DISPUTED]: [JobStatus.COMPLETED, JobStatus.CANCELLED],
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,

    @InjectRepository(JobStatusHistoryEntity)
    private readonly historyRepo: Repository<JobStatusHistoryEntity>,

    private readonly dataSource: DataSource,
  ) {}

  public async updateStatus(
    userId: string,
    jobId: string,
    dto: UpdateJobStatusDto,
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['fixer', 'customer', 'assignedMember'],
    });
    if (!job) throw new NotFoundException('Job not found');

    const member = await this.dataSource
      .getRepository(FixerMemberEntity)
      .findOne({ where: { userId } });
    const isFixerOwner = job.fixer.userId === userId;
    const isAssignedMember =
      member &&
      (job.assignedMemberId === member.id || job.fixerId === member.fixerId);

    if (!isFixerOwner && !isAssignedMember) {
      throw new ForbiddenException(
        'Only the assigned fixer or technician can update job status',
      );
    }

    const allowed = VALID_TRANSITIONS[job.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${dto.status}. Allowed: [${allowed.join(', ')}]`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = job.status;
      job.status = dto.status;

      if (dto.status === JobStatus.COMPLETED) {
        job.completedAt = new Date();
      }
      if (dto.notes) {
        job.fixerNotes = dto.notes;
      }

      await manager.save(job);

      // Sync linked customer repair request status
      if (job.requestId) {
        await manager.update(RepairRequestEntity, job.requestId, {
          status: dto.status as unknown as RequestStatus,
        });
      }

      // Record status history
      const history = new JobStatusHistoryEntity();
      history.jobId = job.id;
      history.previousStatus = fromStatus;
      history.newStatus = dto.status;
      history.actorId = userId;
      history.actorRole = isFixerOwner ? UserRole.FIXER : UserRole.FIXER_MEMBER;
      history.note = dto.notes ?? null;
      await manager.save(history);

      this.logger.log(
        `Job ${jobId}: ${fromStatus} → ${dto.status} (synced request ${job.requestId})`,
      );
      return job;
    });
  }

  public async assignMember(
    userId: string,
    jobId: string,
    memberId: string | null,
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['fixer', 'assignedMember'],
    });
    if (!job) throw new NotFoundException('Job not found');

    if (job.fixer.userId !== userId) {
      throw new ForbiddenException('Only the fixer shop owner can assign members');
    }

    if (job.status !== JobStatus.ASSIGNED) {
      throw new BadRequestException(
        'Technicians can only be assigned before the job is in progress / en route',
      );
    }

    if (memberId) {
      const member = await this.dataSource
        .getRepository(FixerMemberEntity)
        .findOne({
          where: { id: memberId, fixerId: job.fixerId },
        });
      if (!member) throw new NotFoundException('Member not found in your team');
      job.assignedMemberId = member.id;
    } else {
      job.assignedMemberId = null;
    }

    await this.jobRepo.save(job);
    this.logger.log(`Job ${jobId} assigned to member: ${memberId || 'none'}`);
    return this.getJobById(userId, jobId);
  }

  public async requestRevision(
    userId: string,
    jobId: string,
    dto: { revisedTotal: number; notes: string },
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['fixer'],
    });
    if (!job) throw new NotFoundException('Job not found');

    const member = await this.dataSource
      .getRepository(FixerMemberEntity)
      .findOne({ where: { userId } });
    const isOwner = job.fixer.userId === userId;
    const isMember =
      member &&
      (job.assignedMemberId === member.id || job.fixerId === member.fixerId);
    if (!isOwner && !isMember) {
      throw new ForbiddenException(
        'Only the assigned fixer or technician can request quote revision',
      );
    }

    job.revisedTotal = dto.revisedTotal;
    job.revisionNotes = dto.notes;
    job.revisionStatus = QuoteRevisionStatus.PENDING;

    await this.jobRepo.save(job);
    this.logger.log(`Job ${jobId} revision requested: ₹${dto.revisedTotal}`);
    return this.getJobById(userId, jobId);
  }

  public async respondRevision(
    customerUserId: string,
    jobId: string,
    dto: { accept: boolean },
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['customer'],
    });
    if (!job) throw new NotFoundException('Job not found');

    if (job.customer.userId !== customerUserId) {
      throw new ForbiddenException(
        'Only the customer can approve or decline quote revisions',
      );
    }

    if (job.revisionStatus !== QuoteRevisionStatus.PENDING) {
      throw new BadRequestException('No pending quote revision request on this job');
    }

    if (dto.accept) {
      job.agreedTotal = Number(job.revisedTotal || job.agreedTotal);
      job.revisionStatus = QuoteRevisionStatus.APPROVED;

      if (job.quoteId) {
        await this.dataSource.getRepository(QuoteEntity).update(job.quoteId, {
          estimatedTotal: job.agreedTotal,
          ...(job.revisionNotes ? { notes: job.revisionNotes } : {}),
        });
      }
    } else {
      job.revisionStatus = QuoteRevisionStatus.DECLINED;
    }

    await this.jobRepo.save(job);
    this.logger.log(
      `Job ${jobId} revision responded by customer: ${dto.accept ? 'APPROVED' : 'DECLINED'} (agreedTotal: ₹${job.agreedTotal})`,
    );
    return this.getJobById(customerUserId, jobId);
  }

  public async cancel(
    userId: string,
    jobId: string,
    dto: CancelJobDto,
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['fixer', 'customer'],
    });
    if (!job) throw new NotFoundException('Job not found');

    const isFixerOwner = job.fixer.userId === userId;
    const isCustomerOwner = job.customer.userId === userId;
    if (!isFixerOwner && !isCustomerOwner) {
      throw new ForbiddenException('Not authorized');
    }

    const allowed = VALID_TRANSITIONS[job.status] ?? [];
    if (!allowed.includes(JobStatus.CANCELLED)) {
      throw new BadRequestException(`Cannot cancel a job with status: ${job.status}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = job.status;
      job.status = JobStatus.CANCELLED;
      job.cancelledAt = new Date();
      job.cancellationReason = dto.reason;
      await manager.save(job);

      // Reset linked customer repair request back to OPEN/QUOTED so other fixers can quote
      if (job.requestId) {
        const otherQuotesCount = await manager.count(QuoteEntity, {
          where: { requestId: job.requestId, status: QuoteStatus.SUBMITTED },
        });
        const resetStatus =
          otherQuotesCount > 0 ? RequestStatus.QUOTED : RequestStatus.OPEN;
        await manager.update(RepairRequestEntity, job.requestId, {
          status: resetStatus,
        });
      }

      // Update the accepted quote status to WITHDRAWN (if fixer cancelled) or REJECTED (if customer cancelled)
      if (job.quoteId) {
        await manager.update(QuoteEntity, job.quoteId, {
          status: isFixerOwner ? QuoteStatus.WITHDRAWN : QuoteStatus.REJECTED,
        });
      }

      const history = new JobStatusHistoryEntity();
      history.jobId = job.id;
      history.previousStatus = fromStatus;
      history.newStatus = JobStatus.CANCELLED;
      history.actorId = userId;
      history.actorRole = isFixerOwner ? UserRole.FIXER : UserRole.CUSTOMER;
      history.note = dto.reason ?? null;
      await manager.save(history);

      this.logger.log(
        `Job ${jobId} cancelled by ${userId} (synced request ${job.requestId})`,
      );
      return job;
    });
  }

  public async getMyJobs(
    userId: string,
    role: 'customer' | 'fixer' | 'fixer_member',
    page = 1,
    limit = 50,
  ): Promise<{ data: JobEntity[]; total: number }> {
    let effectiveRole: string = role;
    if (role === 'fixer') {
      try {
        const fixer = await this.dataSource
          .getRepository(FixerEntity)
          .findOne({ where: { userId } });
        if (fixer) {
          const acceptedQuotes = await this.dataSource
            .getRepository(QuoteEntity)
            .createQueryBuilder('q')
            .where('q.fixerId = :fixerId AND q.status = :status', {
              fixerId: fixer.id,
              status: QuoteStatus.ACCEPTED,
            })
            .getMany();

          for (const aq of acceptedQuotes) {
            const existingJob = await this.jobRepo.findOne({
              where: { quoteId: aq.id },
            });
            if (!existingJob) {
              const request = await this.dataSource
                .getRepository(RepairRequestEntity)
                .findOne({ where: { id: aq.requestId } });
              if (request) {
                const backfillJob = new JobEntity();
                backfillJob.requestId = aq.requestId;
                backfillJob.quoteId = aq.id;
                backfillJob.fixerId = fixer.id;
                backfillJob.customerId = request.customerId;
                backfillJob.status = JobStatus.ASSIGNED;
                backfillJob.agreedTotal = Number(aq.estimatedTotal ?? 0);
                backfillJob.warrantyDays = Number(aq.warrantyDays ?? 0);
                await this.jobRepo.save(backfillJob);
              }
            }
          }
        } else {
          // Check if caller is a FixerMember
          const member = await this.dataSource
            .getRepository(FixerMemberEntity)
            .findOne({ where: { userId } });
          if (member) {
            effectiveRole = 'fixer_member';
          }
        }
      } catch (err) {
        this.logger.warn(`Backfill in getMyJobs: ${(err as any)?.message}`);
      }
    }

    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.request', 'request')
      .leftJoinAndSelect('request.category', 'category')
      .leftJoinAndSelect('request.brand', 'brand')
      .leftJoinAndSelect('request.media', 'media')
      .leftJoinAndSelect('job.fixer', 'fixer')
      .leftJoinAndSelect('job.customer', 'customer')
      .leftJoinAndSelect('job.quote', 'quote')
      .leftJoinAndSelect('job.assignedMember', 'assignedMember');

    if (effectiveRole === 'fixer') {
      qb.where('fixer.userId = :userId', { userId });
    } else if (effectiveRole === 'fixer_member') {
      const member = await this.dataSource
        .getRepository(FixerMemberEntity)
        .findOne({ where: { userId } });
      if (member) {
        qb.where(
          '(job.assignedMemberId = :memberId OR (job.fixerId = :fixerId AND job.assignedMemberId IS NULL))',
          {
            memberId: member.id,
            fixerId: member.fixerId,
          },
        );
      } else {
        qb.where('1 = 0');
      }
    } else {
      qb.where('customer.userId = :userId', { userId });
    }

    qb.orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  public async getJobById(userId: string, jobId: string): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: [
        'request',
        'request.category',
        'request.brand',
        'request.media',
        'fixer',
        'customer',
        'quote',
        'statusHistory',
        'assignedMember',
      ],
    });
    if (!job) throw new NotFoundException('Job not found');

    const member = await this.dataSource
      .getRepository(FixerMemberEntity)
      .findOne({ where: { userId } });
    const isMember =
      member &&
      (job.assignedMemberId === member.id || job.fixerId === member.fixerId);

    if (job.fixer.userId !== userId && job.customer.userId !== userId && !isMember) {
      throw new ForbiddenException('Not authorized to view this job');
    }
    return job;
  }

  public async schedule(
    fixerUserId: string,
    jobId: string,
    dto: ScheduleJobDto,
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['fixer'],
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.fixer.userId !== fixerUserId) {
      throw new ForbiddenException('Only the assigned fixer can schedule');
    }

    if (dto.scheduledDate) job.scheduledDate = dto.scheduledDate;
    if (dto.scheduledTimeSlot) job.scheduledTimeSlot = dto.scheduledTimeSlot;
    return this.jobRepo.save(job);
  }
}

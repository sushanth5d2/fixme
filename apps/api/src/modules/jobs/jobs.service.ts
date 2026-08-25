import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JobStatus, QuoteStatus } from '@fixme/shared-types';
import { JobEntity } from './job.entity';
import { JobStatusHistoryEntity } from './job-status-history.entity';
import { FixerEntity } from '../fixers/fixer.entity';
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
  [JobStatus.DISPUTED]: [],
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
    fixerUserId: string,
    jobId: string,
    dto: UpdateJobStatusDto,
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['fixer'],
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.fixer.userId !== fixerUserId) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    const allowed = VALID_TRANSITIONS[job.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${dto.status}`,
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

      // Record status history
      const history = manager.create(JobStatusHistoryEntity, {
        jobId: job.id,
        fromStatus,
        toStatus: dto.status,
        changedByUserId: fixerUserId,
        notes: dto.notes ?? null,
      });
      await manager.save(history);

      this.logger.log(`Job ${jobId}: ${fromStatus} → ${dto.status}`);
      return job;
    });
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

      const history = manager.create(JobStatusHistoryEntity, {
        jobId: job.id,
        fromStatus,
        toStatus: JobStatus.CANCELLED,
        changedByUserId: userId,
        notes: dto.reason,
      });
      await manager.save(history);

      this.logger.log(`Job ${jobId} cancelled by ${userId}`);
      return job;
    });
  }

  public async getMyJobs(
    userId: string,
    role: 'customer' | 'fixer',
    page = 1,
    limit = 20,
  ): Promise<{ data: JobEntity[]; total: number }> {
    if (role === 'fixer') {
      try {
        const fixer = await this.dataSource.getRepository(FixerEntity).findOne({ where: { userId } });
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
            const existingJob = await this.jobRepo.findOne({ where: { quoteId: aq.id } });
            if (!existingJob) {
              const request = await this.dataSource.getRepository(RepairRequestEntity).findOne({ where: { id: aq.requestId } });
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
      .leftJoinAndSelect('job.fixer', 'fixer')
      .leftJoinAndSelect('job.customer', 'customer')
      .leftJoinAndSelect('job.quote', 'quote');

    if (role === 'fixer') {
      qb.where('fixer.userId = :userId', { userId });
    } else {
      qb.where('customer.userId = :userId', { userId });
    }

    qb.orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  public async getJobById(
    userId: string,
    jobId: string,
  ): Promise<JobEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['request', 'request.category', 'request.brand', 'fixer', 'customer', 'quote', 'statusHistory'],
    });
    if (!job) throw new NotFoundException('Job not found');

    if (job.fixer.userId !== userId && job.customer.userId !== userId) {
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

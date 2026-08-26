import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplaintStatus, JobStatus, RequestStatus, UserRole } from '@fixme/shared-types';
import { ComplaintEntity } from './complaint.entity';
import { JobEntity } from '../jobs/job.entity';
import { JobStatusHistoryEntity } from '../jobs/job-status-history.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { CreateComplaintDto, UpdateComplaintStatusDto } from './dto/complaint.dto';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,

    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,

    @InjectRepository(JobStatusHistoryEntity)
    private readonly historyRepo: Repository<JobStatusHistoryEntity>,

    @InjectRepository(RepairRequestEntity)
    private readonly requestRepo: Repository<RepairRequestEntity>,
  ) {}

  public async create(
    userId: string,
    dto: CreateComplaintDto,
  ): Promise<ComplaintEntity> {
    let job = await this.jobRepo.findOne({
      where: { id: dto.jobId },
      relations: ['fixer', 'customer'],
    });

    if (!job) {
      job = await this.jobRepo.findOne({
        where: { requestId: dto.jobId },
        relations: ['fixer', 'customer'],
      });
    }

    if (!job) throw new NotFoundException('Associated job not found for dispute');

    const isCustomer = job.customer?.userId === userId;
    const isFixer = job.fixer?.userId === userId;
    if (!isCustomer && !isFixer) {
      // Allow fixer members / workshop owners
      // Check if user is staff or owner
    }

    const respondentId = isCustomer
      ? (job.fixer?.userId || job.fixerId)
      : (job.customer?.userId || job.customerId);

    const complaint = this.complaintRepo.create({
      jobId: job.id,
      complainantId: userId,
      respondentId,
      reason: dto.reason,
      description: dto.description,
      status: ComplaintStatus.OPEN,
    });

    const saved = await this.complaintRepo.save(complaint);

    // Transition Job Status to DISPUTED
    const previousStatus = job.status;
    job.status = JobStatus.DISPUTED;
    await this.jobRepo.save(job);

    // Save Status History
    try {
      const history = this.historyRepo.create({
        jobId: job.id,
        previousStatus: previousStatus as JobStatus,
        newStatus: JobStatus.DISPUTED,
        actorId: userId,
        actorRole: isCustomer ? UserRole.CUSTOMER : UserRole.FIXER,
        note: `Dispute filed by ${isCustomer ? 'Customer' : 'Fixer'}: ${dto.reason}${dto.description ? ' - ' + dto.description : ''}`,
      });
      await this.historyRepo.save(history);
    } catch (hErr) {
      this.logger.warn(`Failed to record job status history for dispute: ${hErr}`);
    }

    // Update Repair Request status if associated
    if (job.requestId) {
      try {
        await this.requestRepo.update(job.requestId, { status: RequestStatus.DISPUTED });
      } catch {}
    }

    this.logger.log(`Dispute/Complaint created: ${saved.id} for job: ${job.id}`);
    return saved;
  }

  public async getByJobOrRequestId(jobIdOrRequestId: string): Promise<ComplaintEntity | null> {
    let complaint = await this.complaintRepo.findOne({
      where: { jobId: jobIdOrRequestId },
      relations: ['complainant', 'respondent'],
      order: { createdAt: 'DESC' },
    });

    if (!complaint) {
      const job = await this.jobRepo.findOne({ where: { requestId: jobIdOrRequestId } });
      if (job) {
        complaint = await this.complaintRepo.findOne({
          where: { jobId: job.id },
          relations: ['complainant', 'respondent'],
          order: { createdAt: 'DESC' },
        });
      }
    }

    return complaint;
  }

  public async getMyComplaints(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ComplaintEntity[]; total: number }> {
    const [data, total] = await this.complaintRepo.findAndCount({
      where: [{ complainantId: userId }, { respondentId: userId }],
      relations: ['job', 'complainant', 'respondent'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  public async getById(
    userId: string,
    complaintId: string,
  ): Promise<ComplaintEntity> {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId },
      relations: ['job', 'complainant', 'respondent'],
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.complainantId !== userId && complaint.respondentId !== userId) {
      throw new ForbiddenException('Not authorized to view this complaint');
    }
    return complaint;
  }

  // ── Admin ──────────────────────────────────────────────────

  public async getAllForAdmin(
    status?: ComplaintStatus,
    page = 1,
    limit = 50,
  ): Promise<{ data: ComplaintEntity[]; total: number }> {
    const query = this.complaintRepo.createQueryBuilder('c');
    if (status && status !== ('ALL' as any)) {
      query.where('c.status = :status', { status });
    }
    query.leftJoinAndSelect('c.job', 'job');
    query.leftJoinAndSelect('c.complainant', 'complainant');
    query.leftJoinAndSelect('c.respondent', 'respondent');
    query.orderBy('c.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  public async updateStatus(
    adminUserId: string,
    complaintId: string,
    dto: UpdateComplaintStatusDto,
  ): Promise<ComplaintEntity> {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId },
      relations: ['job'],
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    complaint.status = dto.status;
    if (dto.adminNotes) complaint.adminNotes = dto.adminNotes;
    if (dto.resolution) {
      complaint.resolution = dto.resolution;
      complaint.resolvedById = adminUserId;
      complaint.resolvedAt = new Date();
    }

    await this.complaintRepo.save(complaint);

    // If resolved or dismissed, optionally restore job status
    if (complaint.jobId) {
      try {
        const job = await this.jobRepo.findOne({ where: { id: complaint.jobId } });
        if (job && job.status === JobStatus.DISPUTED) {
          const nextStatus =
            dto.status === ComplaintStatus.RESOLVED || dto.status === ('CLOSED' as any)
              ? JobStatus.COMPLETED
              : JobStatus.COMPLETED;

          job.status = nextStatus;
          await this.jobRepo.save(job);

          if (job.requestId) {
            await this.requestRepo.update(job.requestId, { status: RequestStatus.COMPLETED });
          }
        }
      } catch {}
    }

    this.logger.log(`Complaint ${complaintId} updated to ${dto.status} by admin ${adminUserId}`);
    return complaint;
  }
}

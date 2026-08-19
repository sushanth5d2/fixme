import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplaintStatus } from '@fixme/shared-types';
import { ComplaintEntity } from './complaint.entity';
import { JobEntity } from '../jobs/job.entity';
import { CreateComplaintDto, UpdateComplaintStatusDto } from './dto/complaint.dto';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,

    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
  ) {}

  public async create(
    userId: string,
    dto: CreateComplaintDto,
  ): Promise<ComplaintEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: dto.jobId },
      relations: ['fixer', 'customer'],
    });
    if (!job) throw new NotFoundException('Job not found');

    const isCustomer = job.customer.userId === userId;
    const isFixer = job.fixer.userId === userId;
    if (!isCustomer && !isFixer) {
      throw new ForbiddenException('You are not a participant of this job');
    }

    const respondentId = isCustomer ? job.fixer.userId : job.customer.userId;

    const complaint = this.complaintRepo.create({
      jobId: dto.jobId,
      complainantId: userId,
      respondentId,
      reason: dto.reason,
      description: dto.description,
      status: ComplaintStatus.OPEN,
    });

    const saved = await this.complaintRepo.save(complaint);
    this.logger.log(`Complaint created: ${saved.id} for job: ${dto.jobId}`);
    return saved;
  }

  public async getMyComplaints(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ComplaintEntity[]; total: number }> {
    const [data, total] = await this.complaintRepo.findAndCount({
      where: [{ complainantId: userId }, { respondentId: userId }],
      relations: ['job'],
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
    limit = 20,
  ): Promise<{ data: ComplaintEntity[]; total: number }> {
    const query = this.complaintRepo.createQueryBuilder('c');
    if (status) query.where('c.status = :status', { status });
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
    this.logger.log(`Complaint ${complaintId} updated to ${dto.status} by admin ${adminUserId}`);
    return complaint;
  }
}

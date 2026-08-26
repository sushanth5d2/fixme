import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import {
  FixerVerificationStatus,
  JobStatus,
  RequestStatus,
  ComplaintStatus,
} from '@fixme/shared-types';
import { CustomerEntity } from '../customers/customer.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { JobEntity } from '../jobs/job.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { ComplaintEntity } from '../complaints/complaint.entity';
import { ReviewEntity } from '../reviews/review.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,

    @InjectRepository(FixerEntity)
    private readonly fixerRepo: Repository<FixerEntity>,

    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,

    @InjectRepository(RepairRequestEntity)
    private readonly requestRepo: Repository<RepairRequestEntity>,

    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,

    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,

    @InjectRepository(DeviceCategoryEntity)
    private readonly categoryRepo: Repository<DeviceCategoryEntity>,

    @InjectRepository(DeviceBrandEntity)
    private readonly brandRepo: Repository<DeviceBrandEntity>,
  ) {}

  public async getDashboardStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalCustomers,
      totalFixers,
      pendingVerifications,
      activeJobs,
      completedToday,
      openRequests,
      openComplaints,
      completedJobsMonth,
    ] = await Promise.all([
      this.customerRepo.count(),
      this.fixerRepo.count({
        where: { verificationStatus: FixerVerificationStatus.VERIFIED },
      }),
      this.fixerRepo.count({
        where: {
          verificationStatus: In([
            FixerVerificationStatus.UNDER_REVIEW,
            FixerVerificationStatus.DOCUMENT_SUBMITTED,
            FixerVerificationStatus.REGISTERED,
          ]),
        },
      }),
      this.jobRepo.count({
        where: {
          status: In([
            JobStatus.ASSIGNED,
            JobStatus.FIXER_ON_THE_WAY,
            JobStatus.DEVICE_RECEIVED,
            JobStatus.DIAGNOSING,
            JobStatus.REPAIR_IN_PROGRESS,
            JobStatus.READY_FOR_DELIVERY,
          ]),
        },
      }),
      this.jobRepo.count({
        where: {
          status: JobStatus.COMPLETED,
          updatedAt: MoreThanOrEqual(today),
        },
      }),
      this.requestRepo.count({
        where: {
          status: In([
            RequestStatus.OPEN,
            RequestStatus.QUOTED,
          ]),
        },
      }),
      this.complaintRepo.count({
        where: {
          status: In([
            ComplaintStatus.OPEN,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.WAITING_FOR_INFORMATION,
          ]),
        },
      }),
      this.jobRepo.find({
        where: {
          status: JobStatus.COMPLETED,
          updatedAt: MoreThanOrEqual(monthStart),
        },
        select: ['agreedTotal', 'revisedTotal'],
      }),
    ]);

    const totalRevenueMonth = completedJobsMonth.reduce(
      (sum, job) => sum + (Number(job.revisedTotal || job.agreedTotal) || 0),
      0,
    );

    return {
      totalCustomers,
      totalFixers,
      pendingVerifications,
      activeJobs,
      completedToday,
      openRequests,
      openComplaints,
      revenueNumber: totalRevenueMonth,
      revenue: `₹${totalRevenueMonth.toLocaleString('en-IN')}`,
    };
  }
}

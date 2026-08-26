import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JobStatus, ReviewStatus } from '@fixme/shared-types';
import { ReviewEntity } from './review.entity';
import { JobEntity } from '../jobs/job.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,

    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,

    @InjectRepository(FixerEntity)
    private readonly fixerRepo: Repository<FixerEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,

    private readonly dataSource: DataSource,
  ) {}

  public async create(
    customerUserId: string,
    jobId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['customer', 'fixer'],
    });
    if (!job) throw new NotFoundException('Job not found');

    // Only the customer who owns the job can review
    if (job.customer.userId !== customerUserId) {
      throw new ForbiddenException('You can only review your own completed jobs');
    }

    // Must be completed
    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException(
        'You can only review a job after it is completed',
      );
    }

    // One review per job
    const existing = await this.reviewRepo.findOne({ where: { jobId } });
    if (existing) {
      throw new ConflictException('You have already reviewed this job');
    }

    return this.dataSource.transaction(async (manager) => {
      const ratingVal = dto.rating ?? 5;
      const review = manager.create(ReviewEntity, {
        jobId,
        customerId: job.customerId,
        fixerId: job.fixerId,
        overallRating: ratingVal,
        serviceQuality: dto.serviceQuality ?? ratingVal,
        communication: dto.communication ?? ratingVal,
        pricing: dto.pricing ?? ratingVal,
        timeliness: dto.timeliness ?? ratingVal,
        professionalism: dto.professionalism ?? ratingVal,
        reviewText: dto.comment ?? dto.reviewText ?? null,
        status: ReviewStatus.VISIBLE,
      });
      const saved = await manager.save(review);

      // Update fixer aggregate rating
      const { avg, count } = await manager
        .createQueryBuilder(ReviewEntity, 'r')
        .select('AVG(r.overallRating)', 'avg')
        .addSelect('COUNT(r.id)', 'count')
        .where('r.fixerId = :fixerId AND r.status = :status', {
          fixerId: job.fixerId,
          status: ReviewStatus.VISIBLE,
        })
        .getRawOne() as { avg: string; count: string };

      await manager.update(FixerEntity, job.fixerId, {
        averageRating: parseFloat(avg) || 0,
        totalReviews: parseInt(count, 10) || 0,
      });

      this.logger.log(`Review created for job ${jobId}: ${dto.rating}/5`);
      return saved;
    });
  }

  public async getFixerReviews(
    fixerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ReviewEntity[]; total: number; averageRating: number }> {
    const fixer = await this.fixerRepo.findOne({ where: { id: fixerId } });
    if (!fixer) throw new NotFoundException('Fixer not found');

    const [data, total] = await this.reviewRepo.findAndCount({
      where: { fixerId, status: ReviewStatus.VISIBLE },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, averageRating: Number(fixer.averageRating) };
  }

  // Admin: list all reviews
  public async listForAdmin(
    page = 1,
    limit = 50,
  ): Promise<{ data: any[]; total: number }> {
    const [reviews, total] = await this.reviewRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('r.fixer', 'fixer')
      .leftJoinAndSelect('r.job', 'job')
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const mapped = reviews.map((r) => ({
      id: r.id,
      rating: r.overallRating,
      comment: r.reviewText,
      isHidden: r.status === ReviewStatus.HIDDEN,
      customer: { email: r.customer?.user?.email || (r.customer as any)?.email || 'Customer' },
      fixer: { companyName: r.fixer?.companyName || 'Fixer' },
      job: { id: r.jobId },
      createdAt: r.createdAt,
    }));

    return { data: mapped, total };
  }

  // Admin: hide/restore reviews
  public async hide(reviewId: string): Promise<{ message: string }> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    review.status = ReviewStatus.HIDDEN;
    await this.reviewRepo.save(review);
    return { message: 'Review hidden' };
  }

  public async restore(reviewId: string): Promise<{ message: string }> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    review.status = ReviewStatus.VISIBLE;
    await this.reviewRepo.save(review);
    return { message: 'Review restored' };
  }
}

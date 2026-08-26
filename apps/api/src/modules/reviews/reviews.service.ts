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
import { JobStatus, ReviewStatus, NotificationType } from '@fixme/shared-types';
import { ReviewEntity } from './review.entity';
import { JobEntity } from '../jobs/job.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { NotificationsService } from '../notifications/notifications.service';
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

    private readonly notificationsService: NotificationsService,

    private readonly dataSource: DataSource,
  ) {}

  public async create(
    customerUserId: string,
    jobId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    return this.createOrUpdate(customerUserId, jobId, dto);
  }

  public async createOrUpdate(
    customerUserId: string,
    jobIdOrRequestId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    let job = await this.jobRepo.findOne({
      where: { id: jobIdOrRequestId },
      relations: ['customer', 'fixer'],
    });

    if (!job) {
      job = await this.jobRepo.findOne({
        where: { requestId: jobIdOrRequestId },
        relations: ['customer', 'fixer'],
      });
    }

    if (!job) throw new NotFoundException('Associated repair job not found');

    // Only the customer who owns the job can review
    if (job.customer && job.customer.userId !== customerUserId) {
      throw new ForbiddenException('You can only review your own repair jobs');
    }

    const ratingVal = Math.min(Math.max(Number(dto.rating ?? dto.overallRating ?? 5), 1), 5);
    const reviewComment = dto.comment ?? dto.reviewText ?? null;

    let review = await this.reviewRepo.findOne({ where: { jobId: job.id } });

    return this.dataSource.transaction(async (manager) => {
      if (review) {
        // Edit existing review
        review.overallRating = ratingVal;
        review.serviceQuality = dto.serviceQuality ?? ratingVal;
        review.communication = dto.communication ?? ratingVal;
        review.pricing = dto.pricing ?? ratingVal;
        review.timeliness = dto.timeliness ?? ratingVal;
        review.professionalism = dto.professionalism ?? ratingVal;
        review.reviewText = reviewComment;
        review.status = ReviewStatus.VISIBLE;
        review = await manager.save(review);
        this.logger.log(`Review updated for job ${job.id}: ${ratingVal}/5`);
      } else {
        // Create new review
        review = manager.create(ReviewEntity, {
          jobId: job.id,
          customerId: job.customerId,
          fixerId: job.fixerId,
          overallRating: ratingVal,
          serviceQuality: dto.serviceQuality ?? ratingVal,
          communication: dto.communication ?? ratingVal,
          pricing: dto.pricing ?? ratingVal,
          timeliness: dto.timeliness ?? ratingVal,
          professionalism: dto.professionalism ?? ratingVal,
          reviewText: reviewComment,
          status: ReviewStatus.VISIBLE,
        });
        review = await manager.save(review);
        this.logger.log(`Review created for job ${job.id}: ${ratingVal}/5`);
      }

      // Recalculate Fixer aggregate rating and total reviews
      const { avg, count } = (await manager
        .createQueryBuilder(ReviewEntity, 'r')
        .select('AVG(r.overallRating)', 'avg')
        .addSelect('COUNT(r.id)', 'count')
        .where('r.fixerId = :fixerId AND r.status = :status', {
          fixerId: job.fixerId,
          status: ReviewStatus.VISIBLE,
        })
        .getRawOne()) as { avg: string; count: string };

      await manager.update(FixerEntity, job.fixerId, {
        averageRating: parseFloat(avg) || 0,
        totalReviews: parseInt(count, 10) || 0,
      });

      // Notify fixer about the review
      try {
        const fixer = await manager.getRepository(FixerEntity).findOne({ where: { id: job.fixerId } });
        if (fixer?.userId) {
          await this.notificationsService.create({
            userId: fixer.userId,
            type: NotificationType.REVIEW_RECEIVED,
            title: '⭐ New Customer Review',
            body: `You received a ★ ${ratingVal}.0 rating from a customer!`,
            data: { reviewId: review.id, jobId: job.id, rating: ratingVal },
          });
        }
      } catch (err: any) {}

      return review;
    });
  }

  public async getByJobOrRequestId(jobIdOrRequestId: string): Promise<ReviewEntity | null> {
    let review = await this.reviewRepo.findOne({
      where: { jobId: jobIdOrRequestId },
      relations: ['customer', 'customer.user'],
    });
    if (review) return review;

    const job = await this.jobRepo.findOne({ where: { requestId: jobIdOrRequestId } });
    if (job) {
      review = await this.reviewRepo.findOne({
        where: { jobId: job.id },
        relations: ['customer', 'customer.user'],
      });
    }
    return review;
  }

  public async getFixerReviews(
    fixerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; total: number; averageRating: number; totalReviews: number }> {
    const fixer = await this.fixerRepo.findOne({ where: { id: fixerId } });
    if (!fixer) throw new NotFoundException('Fixer not found');

    const [data, total] = await this.reviewRepo.findAndCount({
      where: { fixerId, status: ReviewStatus.VISIBLE },
      relations: ['customer', 'customer.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const mapped = data.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      overallRating: Number(r.overallRating),
      rating: Number(r.overallRating),
      serviceQuality: Number(r.serviceQuality),
      communication: Number(r.communication),
      pricing: Number(r.pricing),
      timeliness: Number(r.timeliness),
      professionalism: Number(r.professionalism),
      reviewText: r.reviewText,
      comment: r.reviewText,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      customerName:
        `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.trim() ||
        r.customer?.user?.email?.split('@')[0] ||
        'Verified Customer',
      customer: {
        firstName: r.customer?.firstName || r.customer?.user?.email?.split('@')[0] || 'Customer',
        lastName: r.customer?.lastName || '',
      },
    }));

    return {
      data: mapped,
      total,
      totalReviews: total,
      averageRating: Number(fixer.averageRating || 0),
    };
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

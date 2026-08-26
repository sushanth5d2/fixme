import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QuoteStatus, RequestStatus, JobStatus, UserRole, NotificationType } from '@fixme/shared-types';
import { QuoteEntity } from './quote.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { JobEntity } from '../jobs/job.entity';
import { JobStatusHistoryEntity } from '../jobs/job-status-history.entity';
import { ConversationEntity } from '../chat/conversation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmitQuoteDto, AcceptQuoteDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @InjectRepository(QuoteEntity)
    private readonly quoteRepo: Repository<QuoteEntity>,

    @InjectRepository(RepairRequestEntity)
    private readonly requestRepo: Repository<RepairRequestEntity>,

    @InjectRepository(FixerEntity)
    private readonly fixerRepo: Repository<FixerEntity>,

    private readonly notificationsService: NotificationsService,

    private readonly dataSource: DataSource,
  ) {}

  public async submit(
    fixerUserId: string,
    dto: SubmitQuoteDto,
  ): Promise<QuoteEntity> {
    const fixer = await this.fixerRepo.findOne({ where: { userId: fixerUserId } });
    if (!fixer) throw new NotFoundException('Fixer profile not found');

    const request = await this.requestRepo.findOne({ where: { id: dto.requestId } });
    if (!request) throw new NotFoundException('Repair request not found');

    if (request.status !== RequestStatus.OPEN && request.status !== RequestStatus.QUOTED) {
      throw new BadRequestException('This request is no longer accepting quotes');
    }

    const existingQuote = await this.quoteRepo.findOne({
      where: { requestId: dto.requestId, fixerId: fixer.id },
    });

    const totalAmount = Number((dto as any).amount ?? (dto as any).estimatedTotal ?? 0);
    const durationDays = (dto as any).estimatedCompletionDays ?? ((dto as any).estimatedDurationHours ? Math.max(1, Math.ceil((dto as any).estimatedDurationHours / 24)) : 1);
    const notesText = (dto as any).diagnosisNotes ?? (dto as any).notes ?? null;
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 7);
    const validUntilStr = validUntilDate.toISOString().split('T')[0];

    if (existingQuote && existingQuote.status !== QuoteStatus.WITHDRAWN) {
      if (existingQuote.status === QuoteStatus.SUBMITTED || existingQuote.status === QuoteStatus.VIEWED) {
        existingQuote.estimatedTotal = totalAmount;
        existingQuote.notes = notesText;
        existingQuote.estimatedCompletionDays = durationDays;
        existingQuote.warrantyDays = Number(dto.warrantyDays ?? 0);
        existingQuote.validUntil = validUntilStr;
        existingQuote.submittedAt = new Date();
        const updated = await this.quoteRepo.save(existingQuote);
        this.logger.log(`Quote ${updated.id} updated by fixer ${fixer.id} for request ${dto.requestId}`);
        return updated;
      }
      throw new ConflictException(
        existingQuote.status === QuoteStatus.ACCEPTED
          ? 'This quote has already been accepted by the customer. To change price or diagnosis, submit a Quote Revision Request from Manage Job.'
          : 'You have already submitted a quote for this request that cannot be directly edited.',
      );
    }

    const quote = new QuoteEntity();
    quote.requestId = dto.requestId;
    quote.fixerId = fixer.id;
    quote.estimatedTotal = totalAmount;
    quote.notes = notesText;
    quote.estimatedCompletionDays = durationDays;
    quote.warrantyDays = Number(dto.warrantyDays ?? 0);
    quote.status = QuoteStatus.SUBMITTED;
    quote.submittedAt = new Date();
    quote.validUntil = validUntilStr;

    const saved = await this.quoteRepo.save(quote);

    // Update request status to QUOTED if still OPEN
    if (request.status === RequestStatus.OPEN) {
      await this.requestRepo.update(request.id, { status: RequestStatus.QUOTED });
    }

    // Notify customer about received quote
    try {
      if (request.customerId) {
        const cust = await this.dataSource
          .getRepository(CustomerEntity)
          .findOne({ where: { id: request.customerId } });
        if (cust?.userId) {
          await this.notificationsService.create({
            userId: cust.userId,
            type: NotificationType.QUOTE_RECEIVED,
            title: '💰 New Quote Received',
            body: `${fixer.companyName || 'A verified fixer'} sent a quote of ₹${totalAmount.toLocaleString('en-IN')}`,
            data: {
              requestId: request.id,
              quoteId: saved.id,
              fixerId: fixer.id,
              amount: totalAmount,
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch quote notification: ${err?.message}`);
    }

    this.logger.log(`Quote ${saved.id} submitted by fixer ${fixer.id} for request ${dto.requestId}`);
    return saved;
  }

  public async getMyQuoteForRequest(
    fixerUserId: string,
    requestId: string,
  ): Promise<QuoteEntity | null> {
    const fixer = await this.fixerRepo.findOne({ where: { userId: fixerUserId } });
    if (!fixer) return null;

    const quote = await this.quoteRepo.findOne({
      where: { requestId, fixerId: fixer.id },
    });
    return quote;
  }

  public async accept(
    customerUserId: string,
    quoteId: string,
    dto: AcceptQuoteDto,
  ): Promise<QuoteEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Lock the quote row to prevent race conditions
      const quote = await manager
        .createQueryBuilder(QuoteEntity, 'q')
        .setLock('pessimistic_write')
        .where('q.id = :quoteId', { quoteId })
        .getOne();

      if (!quote) throw new NotFoundException('Quote not found');
      if (quote.status !== QuoteStatus.SUBMITTED && quote.status !== QuoteStatus.VIEWED) {
        throw new BadRequestException(`Cannot accept a quote with status: ${quote.status}`);
      }

      const request = await manager.findOne(RepairRequestEntity, {
        where: { id: quote.requestId },
        relations: ['customer'],
      });
      if (!request) throw new NotFoundException('Repair request not found');
      if (request.customer.userId !== customerUserId) {
        throw new ForbiddenException('You can only accept quotes for your own requests');
      }

      // Accept this quote
      quote.status = QuoteStatus.ACCEPTED;
      quote.acceptedAt = new Date();
      quote.customerNotes = dto.customerNotes ?? null;
      await manager.save(quote);

      // Reject all other quotes for this request
      await manager
        .createQueryBuilder()
        .update(QuoteEntity)
        .set({ status: QuoteStatus.REJECTED, rejectedAt: new Date() })
        .where('request_id = :requestId AND id != :quoteId AND status IN (:...activeStatuses)', {
          requestId: quote.requestId,
          quoteId,
          activeStatuses: [QuoteStatus.SUBMITTED, QuoteStatus.VIEWED, QuoteStatus.DRAFT],
        })
        .execute();

      // Update request status
      await manager.update(RepairRequestEntity, quote.requestId, {
        status: RequestStatus.CUSTOMER_ACCEPTED,
      });

      // Create Job for assigned fixer
      const job = new JobEntity();
      job.requestId = quote.requestId;
      job.quoteId = quote.id;
      job.fixerId = quote.fixerId;
      job.customerId = request.customerId;
      job.status = JobStatus.ASSIGNED;
      job.agreedTotal = Number(quote.estimatedTotal ?? 0);
      job.warrantyDays = Number(quote.warrantyDays ?? 0);
      const savedJob = await manager.save(job);

      // Record initial job status history
      const history = new JobStatusHistoryEntity();
      history.jobId = savedJob.id;
      history.previousStatus = null;
      history.newStatus = JobStatus.ASSIGNED;
      history.actorId = customerUserId;
      history.actorRole = UserRole.CUSTOMER;
      history.note = 'Quote accepted by customer';
      await manager.save(history);

      // Link any conversation for this request to the new job
      await manager
        .createQueryBuilder()
        .update(ConversationEntity)
        .set({ jobId: savedJob.id })
        .where('request_id = :requestId', { requestId: quote.requestId })
        .execute();

      // Notify fixer that quote was accepted
      try {
        if (quote.fixerId) {
          const fixer = await manager.getRepository(FixerEntity).findOne({ where: { id: quote.fixerId } });
          if (fixer?.userId) {
            await this.notificationsService.create({
              userId: fixer.userId,
              type: NotificationType.QUOTE_ACCEPTED,
              title: '🎉 Quote Accepted!',
              body: `Customer accepted your quote of ₹${Number(quote.estimatedTotal || 0).toLocaleString('en-IN')}. A new repair job has been assigned!`,
              data: {
                jobId: savedJob.id,
                requestId: quote.requestId,
                quoteId: quote.id,
              },
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch quote accepted notification: ${err?.message}`);
      }

      this.logger.log(`Job ${savedJob.id} created for accepted quote ${quoteId}`);
      return quote;
    });
  }

  public async withdraw(fixerUserId: string, quoteId: string): Promise<{ message: string }> {
    const fixer = await this.fixerRepo.findOne({ where: { userId: fixerUserId } });
    if (!fixer) throw new NotFoundException('Fixer profile not found');

    const quote = await this.quoteRepo.findOne({ where: { id: quoteId, fixerId: fixer.id } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.SUBMITTED && quote.status !== QuoteStatus.VIEWED) {
      throw new BadRequestException('Only submitted or viewed quotes can be withdrawn');
    }

    quote.status = QuoteStatus.WITHDRAWN;
    quote.withdrawnAt = new Date();
    await this.quoteRepo.save(quote);

    return { message: 'Quote withdrawn successfully' };
  }

  public async getQuotesForRequest(requestId: string): Promise<QuoteEntity[]> {
    return this.quoteRepo.find({
      where: { requestId },
      relations: ['fixer'],
      order: { estimatedTotal: 'ASC', createdAt: 'ASC' },
    });
  }

  public async getMyQuotes(
    fixerUserId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: QuoteEntity[]; total: number }> {
    const fixer = await this.fixerRepo.findOne({ where: { userId: fixerUserId } });
    if (!fixer) throw new NotFoundException('Fixer profile not found');

    const [data, total] = await this.quoteRepo.findAndCount({
      where: { fixerId: fixer.id },
      relations: ['request', 'request.category'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}

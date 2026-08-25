import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserRole } from '@fixme/shared-types';
import { ConversationEntity } from './conversation.entity';
import { ConversationMemberEntity } from './conversation-member.entity';
import { MessageEntity } from './message.entity';
import { JobEntity } from '../jobs/job.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { SendMessageDto, CreateConversationDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,

    @InjectRepository(ConversationMemberEntity)
    private readonly memberRepo: Repository<ConversationMemberEntity>,

    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,

    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,

    @InjectRepository(RepairRequestEntity)
    private readonly requestRepo: Repository<RepairRequestEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,

    @InjectRepository(FixerEntity)
    private readonly fixerRepo: Repository<FixerEntity>,

    private readonly dataSource: DataSource,
  ) {}

  public async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationEntity> {
    if (dto.jobId) {
      const job = await this.jobRepo.findOne({
        where: { id: dto.jobId },
        relations: ['fixer', 'customer'],
      });
      if (!job) throw new NotFoundException('Job not found');

      const isParticipant =
        job.fixer?.userId === userId || job.customer?.userId === userId;
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant of this job');
      }

      // Check if conversation already exists for this job
      const existing = await this.conversationRepo.findOne({
        where: { jobId: dto.jobId },
      });
      if (existing) return existing;

      return this.dataSource.transaction(async (manager) => {
        const conversation = manager.create(ConversationEntity, {
          jobId: dto.jobId,
          requestId: job.requestId,
          isActive: true,
        });
        const saved = await manager.save(conversation);

        // Add both participants
        const customerMember = manager.create(ConversationMemberEntity, {
          conversationId: saved.id,
          userId: job.customer.userId,
          role: UserRole.CUSTOMER,
        });
        const fixerMember = manager.create(ConversationMemberEntity, {
          conversationId: saved.id,
          userId: job.fixer.userId,
          role: UserRole.FIXER,
        });
        await manager.save([customerMember, fixerMember]);

        if (dto.initialMessage) {
          const msg = manager.create(MessageEntity, {
            conversationId: saved.id,
            senderId: userId,
            content: dto.initialMessage,
          });
          await manager.save(msg);
          saved.lastMessageAt = msg.createdAt;
          await manager.save(saved);
        }
        this.logger.log(`Conversation created: ${saved.id} for job: ${dto.jobId}`);
        return saved;
      });
    }

    if (dto.requestId) {
      const request = await this.requestRepo.findOne({
        where: { id: dto.requestId },
        relations: ['customer'],
      });
      if (!request) throw new NotFoundException('Repair request not found');

      let customerUserId: string | undefined = request.customer?.userId;
      if (!customerUserId && request.customerId) {
        const cust = await this.customerRepo.findOne({ where: { id: request.customerId } });
        customerUserId = cust?.userId;
      }
      if (!customerUserId) throw new BadRequestException('Customer user not found for request');

      const fixerUserId = userId;

      const existingConv = await this.conversationRepo.findOne({
        where: { requestId: dto.requestId },
      });
      if (existingConv) {
        const isMember = await this.memberRepo.findOne({
          where: { conversationId: existingConv.id, userId: fixerUserId },
        });
        if (!isMember) {
          const newMember = this.memberRepo.create({
            conversationId: existingConv.id,
            userId: fixerUserId,
            role: UserRole.FIXER,
          });
          await this.memberRepo.save(newMember);
        }
        return existingConv;
      }

      return this.dataSource.transaction(async (manager) => {
        const conversation = manager.create(ConversationEntity, {
          requestId: dto.requestId,
          isActive: true,
        });
        const saved = await manager.save(conversation);

        const customerMember = manager.create(ConversationMemberEntity, {
          conversationId: saved.id,
          userId: customerUserId!,
          role: UserRole.CUSTOMER,
        });
        const fixerMember = manager.create(ConversationMemberEntity, {
          conversationId: saved.id,
          userId: fixerUserId,
          role: UserRole.FIXER,
        });
        await manager.save([customerMember, fixerMember]);

        if (dto.initialMessage) {
          const msg = manager.create(MessageEntity, {
            conversationId: saved.id,
            senderId: userId,
            content: dto.initialMessage,
          });
          await manager.save(msg);
          saved.lastMessageAt = msg.createdAt;
          await manager.save(saved);
        }
        this.logger.log(`Conversation created: ${saved.id} for request: ${dto.requestId}`);
        return saved;
      });
    }

    throw new BadRequestException('Either jobId or requestId must be provided');
  }

  public async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageEntity> {
    const member = await this.memberRepo.findOne({
      where: { conversationId: dto.conversationId, userId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: dto.conversationId },
    });
    if (!conversation || !conversation.isActive) {
      throw new ForbiddenException('This conversation is no longer active');
    }

    const message = this.messageRepo.create({
      conversationId: dto.conversationId,
      senderId: userId,
      content: dto.content,
    });
    const saved = await this.messageRepo.save(message);

    // Update last message timestamp
    await this.conversationRepo.update(dto.conversationId, {
      lastMessageAt: new Date(),
    });

    return saved;
  }

  public async getMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: MessageEntity[]; total: number }> {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    const [data, total] = await this.messageRepo.findAndCount({
      where: { conversationId },
      relations: ['sender', 'attachments'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Mark as read
    try {
      await this.messageRepo.createQueryBuilder()
        .update(MessageEntity)
        .set({ isRead: true, readAt: new Date() })
        .where('conversationId = :conversationId AND senderId != :userId', { conversationId, userId })
        .execute();
    } catch {}

    return { data, total };
  }

  public async getMyConversations(
    userId: string,
  ): Promise<ConversationEntity[]> {
    try {
      const myMemberships = await this.memberRepo.find({
        where: { userId },
      });

      if (!myMemberships || myMemberships.length === 0) return [];

      const conversationIds = myMemberships.map((m) => m.conversationId);
      const conversations = await this.conversationRepo
        .createQueryBuilder('conv')
        .leftJoinAndSelect('conv.members', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .where('conv.id IN (:...conversationIds)', { conversationIds })
        .orderBy('conv.lastMessageAt', 'DESC', 'NULLS LAST')
        .addOrderBy('conv.createdAt', 'DESC')
        .getMany();

      return conversations;
    } catch (err) {
      this.logger.error('Failed to get my conversations', err);
      return [];
    }
  }

  public async markAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ message: string }> {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    if (!member) throw new ForbiddenException('Not a member');
    try {
      await this.messageRepo.createQueryBuilder()
        .update(MessageEntity)
        .set({ isRead: true, readAt: new Date() })
        .where('conversationId = :conversationId AND senderId != :userId', { conversationId, userId })
        .execute();
    } catch {}
    return { message: 'Marked as read' };
  }
}

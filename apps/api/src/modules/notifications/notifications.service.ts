import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '@fixme/shared-types';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  /**
   * Internal method — called by other services to create notifications.
   */
  public async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationEntity> {
    const notification = this.notificationRepo.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? null,
    });
    const saved = await this.notificationRepo.save(notification);
    this.logger.debug(`Notification sent to ${params.userId}: ${params.type}`);
    return saved;
  }

  public async getMyNotifications(
    userId: string,
    page = 1,
    limit = 30,
  ): Promise<{ data: NotificationEntity[]; total: number; unreadCount: number }> {
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return { data, total, unreadCount };
  }

  public async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<{ message: string }> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationRepo.save(notification);
    return { message: 'Marked as read' };
  }

  public async markAllAsRead(userId: string): Promise<{ message: string }> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { message: 'All notifications marked as read' };
  }

  public async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationEntity } from './conversation.entity';
import { ConversationMemberEntity } from './conversation-member.entity';
import { MessageEntity } from './message.entity';
import { MessageAttachmentEntity } from './message-attachment.entity';
import { JobEntity } from '../jobs/job.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { QuoteEntity } from '../quotes/quote.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationEntity,
      ConversationMemberEntity,
      MessageEntity,
      MessageAttachmentEntity,
      JobEntity,
      RepairRequestEntity,
      CustomerEntity,
      FixerEntity,
      QuoteEntity,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

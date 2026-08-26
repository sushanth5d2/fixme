import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuoteEntity } from './quote.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { JobEntity } from '../jobs/job.entity';
import { JobStatusHistoryEntity } from '../jobs/job-status-history.entity';
import { ConversationEntity } from '../chat/conversation.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuoteEntity,
      RepairRequestEntity,
      FixerEntity,
      JobEntity,
      JobStatusHistoryEntity,
      ConversationEntity,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}

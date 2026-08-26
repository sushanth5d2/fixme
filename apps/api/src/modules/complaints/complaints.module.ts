import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { ComplaintEntity } from './complaint.entity';
import { JobEntity } from '../jobs/job.entity';
import { JobStatusHistoryEntity } from '../jobs/job-status-history.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplaintEntity, JobEntity, JobStatusHistoryEntity, RepairRequestEntity]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}

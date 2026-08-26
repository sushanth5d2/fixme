import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobEntity } from './job.entity';
import { JobStatusHistoryEntity } from './job-status-history.entity';
import { FixerMemberEntity } from '../fixers/fixer-member.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity, JobStatusHistoryEntity, FixerMemberEntity]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}

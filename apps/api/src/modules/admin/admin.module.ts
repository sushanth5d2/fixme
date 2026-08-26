import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CustomerEntity } from '../customers/customer.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { JobEntity } from '../jobs/job.entity';
import { RepairRequestEntity } from '../repair-requests/repair-request.entity';
import { ComplaintEntity } from '../complaints/complaint.entity';
import { ReviewEntity } from '../reviews/review.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';
import { UserEntity } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      FixerEntity,
      JobEntity,
      RepairRequestEntity,
      ComplaintEntity,
      ReviewEntity,
      DeviceCategoryEntity,
      DeviceBrandEntity,
      UserEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

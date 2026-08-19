import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairRequestsController } from './repair-requests.controller';
import { RepairRequestsService } from './repair-requests.service';
import { RepairRequestEntity } from './repair-request.entity';
import { RepairRequestMediaEntity } from './repair-request-media.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { AddressEntity } from '../customers/address.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RepairRequestEntity,
      RepairRequestMediaEntity,
      CustomerEntity,
      AddressEntity,
      DeviceCategoryEntity,
      DeviceBrandEntity,
    ]),
    AuthModule,
  ],
  controllers: [RepairRequestsController],
  providers: [RepairRequestsService],
  exports: [RepairRequestsService],
})
export class RepairRequestsModule {}

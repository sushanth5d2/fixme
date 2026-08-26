import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixersController } from './fixers.controller';
import { FixersService } from './fixers.service';
import { FixerEntity } from './fixer.entity';
import { FixerMemberEntity } from './fixer-member.entity';
import { FixerDocumentEntity } from './fixer-document.entity';
import { FixerServiceEntity } from './fixer-service.entity';
import { FixerServiceAreaEntity } from './fixer-service-area.entity';
import { UserEntity } from '../users/user.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FixerEntity,
      FixerMemberEntity,
      FixerDocumentEntity,
      FixerServiceEntity,
      FixerServiceAreaEntity,
      DeviceCategoryEntity,
      DeviceBrandEntity,
      UserEntity,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [FixersController],
  providers: [FixersService],
  exports: [FixersService],
})
export class FixersModule {}

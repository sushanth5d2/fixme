import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixersController } from './fixers.controller';
import { FixersService } from './fixers.service';
import { FixerEntity } from './fixer.entity';
import { FixerDocumentEntity } from './fixer-document.entity';
import { FixerServiceEntity } from './fixer-service.entity';
import { FixerServiceAreaEntity } from './fixer-service-area.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FixerEntity,
      FixerDocumentEntity,
      FixerServiceEntity,
      FixerServiceAreaEntity,
      DeviceCategoryEntity,
      DeviceBrandEntity,
    ]),
    AuthModule,
  ],
  controllers: [FixersController],
  providers: [FixersService],
  exports: [FixersService],
})
export class FixersModule {}

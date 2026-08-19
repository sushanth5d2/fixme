import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

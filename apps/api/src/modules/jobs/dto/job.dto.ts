import { IsEnum, IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@fixme/shared-types';

const FIXER_ALLOWED_TRANSITIONS: JobStatus[] = [
  JobStatus.FIXER_ON_THE_WAY,
  JobStatus.DEVICE_RECEIVED,
  JobStatus.DIAGNOSING,
  JobStatus.REPAIR_IN_PROGRESS,
  JobStatus.READY_FOR_DELIVERY,
  JobStatus.COMPLETED,
];

export class UpdateJobStatusDto {
  @ApiProperty({ enum: FIXER_ALLOWED_TRANSITIONS })
  @IsEnum(FIXER_ALLOWED_TRANSITIONS, {
    message: `status must be one of: ${FIXER_ALLOWED_TRANSITIONS.join(', ')}`,
  })
  status!: JobStatus;

  @ApiPropertyOptional({ example: 'Replaced screen, testing now' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CancelJobDto {
  @ApiProperty({ example: 'Customer unavailable' })
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ScheduleJobDto {
  @ApiPropertyOptional({ example: '2025-12-30' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: 'MORNING' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  scheduledTimeSlot?: string;
}

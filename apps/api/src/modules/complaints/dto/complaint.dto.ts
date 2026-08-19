import { IsEnum, IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintReason, ComplaintStatus } from '@fixme/shared-types';

export class CreateComplaintDto {
  @ApiProperty({ description: 'Job UUID' })
  @IsUUID()
  jobId!: string;

  @ApiProperty({ enum: ComplaintReason })
  @IsEnum(ComplaintReason)
  reason!: ComplaintReason;

  @ApiProperty({ example: 'The fixer did not arrive at the scheduled time and is not responding.' })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description!: string;
}

export class UpdateComplaintStatusDto {
  @ApiProperty({ enum: [ComplaintStatus.UNDER_REVIEW, ComplaintStatus.WAITING_FOR_INFORMATION, ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED, ComplaintStatus.CLOSED] })
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;

  @ApiPropertyOptional({ example: 'Contacted fixer, awaiting response.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;

  @ApiPropertyOptional({ example: 'Refund issued to customer.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}

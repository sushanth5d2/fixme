import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UrgencyLevel } from '@fixme/shared-types';

export class CreateRepairRequestDto {
  @ApiProperty({ description: 'Device category UUID' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Device brand UUID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ example: 'Samsung Galaxy S23', description: 'Device model/name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceModel?: string;

  @ApiProperty({ example: 'Screen is broken, does not display anything after a fall.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({ enum: UrgencyLevel, default: UrgencyLevel.MEDIUM })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  priority?: UrgencyLevel;

  @ApiPropertyOptional({ description: 'Saved address UUID' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({ example: '2025-12-25', description: 'Preferred service date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({ example: 'MORNING', description: 'Preferred time slot: MORNING, AFTERNOON, EVENING' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredTimeSlot?: string;
}

export class CancelRepairRequestDto {
  @ApiPropertyOptional({ example: 'Found a local technician' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

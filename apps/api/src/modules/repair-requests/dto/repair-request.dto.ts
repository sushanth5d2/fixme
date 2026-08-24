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
  @ApiProperty({ description: 'Device category UUID or slug (e.g. phone, laptop, tv)' })
  @IsString()
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

  @ApiPropertyOptional({ example: '9876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @ApiPropertyOptional({ example: 'Flat 402, Sunshine Apts' })
  @IsOptional()
  @IsString()
  houseBuilding?: string;

  @ApiPropertyOptional({ example: 'MG Road' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: 'Indiranagar' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: 'Near Metro Station' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '560038' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 12.9716, description: 'Latitude of service location' })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946, description: 'Longitude of service location' })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Array of photo URLs or storage keys' })
  @IsOptional()
  photos?: string[];
}

export class CancelRepairRequestDto {
  @ApiPropertyOptional({ example: 'Found a local technician' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

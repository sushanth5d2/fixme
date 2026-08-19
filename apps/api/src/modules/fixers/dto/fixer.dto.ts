import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  MaxLength,
  MinLength,
  Min,
  Max,
  Matches,
  IsUUID,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DocumentType, ServiceAreaType } from '@fixme/shared-types';
import { GSTIN_REGEX, PINCODE_REGEX } from '@fixme/validation';

const WORKING_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export class RegisterFixerDto {
  @ApiProperty({ example: 'Suresh Patel', description: 'Owner/proprietor full name' })
  @IsString()
  @MaxLength(200)
  ownerName!: string;

  @ApiProperty({ example: 'TechFix Solutions Pvt Ltd' })
  @IsString()
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({ example: '29AAGCB1234N1Z5', description: '15-character GSTIN' })
  @IsOptional()
  @IsString()
  @Matches(GSTIN_REGEX, { message: 'gstin must be a valid 15-character GSTIN' })
  gstin?: string;

  @ApiPropertyOptional({ example: 'Expert mobile and laptop repair with 10+ years experience' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 5, minimum: 0, maximum: 50 })
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  emergencyService!: boolean;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'workingHoursStart must be in HH:MM format' })
  workingHoursStart?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'workingHoursEnd must be in HH:MM format' })
  workingHoursEnd?: string;

  @ApiPropertyOptional({ example: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] })
  @IsOptional()
  @IsArray()
  @IsEnum(WORKING_DAYS, { each: true, message: 'Each working day must be MON,TUE,WED,THU,FRI,SAT,SUN' })
  @ArrayMaxSize(7)
  workingDays?: string[];

  @ApiProperty({ example: '12, Industrial Estate, Bengaluru' })
  @IsString()
  @MaxLength(500)
  addressLine!: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '560058' })
  @IsString()
  @Matches(PINCODE_REGEX, { message: 'pincode must be a valid 6-digit Indian pincode' })
  pincode!: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class UpdateFixerProfileDto extends PartialType(RegisterFixerDto) {}

export class AddFixerServiceDto {
  @ApiProperty({ description: 'Device category UUID' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Device brand UUID (null = all brands in category)' })
  @IsOptional()
  @IsUUID()
  brandId?: string;
}

export class AddFixerServiceAreaDto {
  @ApiProperty({ enum: ServiceAreaType })
  @IsEnum(ServiceAreaType)
  type!: ServiceAreaType;

  @ApiPropertyOptional({ example: '560034' })
  @IsOptional()
  @IsString()
  @Matches(PINCODE_REGEX, { message: 'pincode must be a valid 6-digit Indian pincode' })
  pincode?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 10.5, description: 'Radius in kilometers (for RADIUS type)' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(100)
  radiusKm?: number;
}

export class VerifyFixerDto {
  @ApiProperty({ description: 'Approve or reject fixer verification' })
  @IsEnum(['VERIFIED', 'REJECTED'])
  action!: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Required when action is REJECTED' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  rejectionReason?: string;
}

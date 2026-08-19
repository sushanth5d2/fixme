import {
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitQuoteDto {
  @ApiProperty({ description: 'Repair request UUID' })
  @IsUUID()
  requestId!: string;

  @ApiProperty({ example: 2500.00, description: 'Quote amount in INR' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(9999999)
  amount!: number;

  @ApiPropertyOptional({ example: 'Screen needs replacement. Original Samsung AMOLED panel.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  diagnosisNotes?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(720)
  estimatedDurationHours?: number;

  @ApiPropertyOptional({ example: 30, description: 'Warranty in days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  warrantyDays?: number;
}

export class AcceptQuoteDto {
  @ApiPropertyOptional({ example: 'Please come at 10 AM' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;
}

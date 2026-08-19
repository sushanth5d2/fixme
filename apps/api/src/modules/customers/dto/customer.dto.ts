import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AddressType } from '@fixme/shared-types';
import { PINCODE_REGEX } from '@fixme/validation';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'Ravi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}

export class CreateAddressDto {
  @ApiProperty({ enum: AddressType, example: AddressType.HOME })
  @IsEnum(AddressType)
  type!: AddressType;

  @ApiProperty({ example: 'Flat 201, Green Valley Apartments' })
  @IsString()
  @MaxLength(255)
  houseBuilding!: string;

  @ApiProperty({ example: 'MG Road' })
  @IsString()
  @MaxLength(255)
  street!: string;

  @ApiProperty({ example: 'Koramangala' })
  @IsString()
  @MaxLength(255)
  area!: string;

  @ApiPropertyOptional({ example: 'Near Forum Mall' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  landmark?: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '560034', description: '6-digit Indian pincode' })
  @IsString()
  @Matches(PINCODE_REGEX, { message: 'pincode must be a valid 6-digit Indian pincode' })
  pincode!: string;

  @ApiPropertyOptional({ example: 12.9352, description: 'GPS latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.6245, description: 'GPS longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

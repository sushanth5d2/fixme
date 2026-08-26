import { IsString, IsOptional, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation UUID' })
  @IsUUID()
  conversationId!: string;

  @ApiProperty({ example: 'Hi, I can fix your device. When are you available?' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Job UUID to link conversation to' })
  @IsOptional()
  @ValidateIf((o) => o.jobId !== undefined && o.jobId !== null && o.jobId !== '')
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Repair Request UUID to link conversation to' })
  @IsOptional()
  @ValidateIf((o) => o.requestId !== undefined && o.requestId !== null && o.requestId !== '')
  @IsUUID()
  requestId?: string;

  @ApiPropertyOptional({ description: 'Target Fixer UUID' })
  @IsOptional()
  @ValidateIf((o) => o.fixerId !== undefined && o.fixerId !== null && o.fixerId !== '')
  @IsUUID()
  fixerId?: string;

  @ApiPropertyOptional({ description: 'Target Fixer User UUID' })
  @IsOptional()
  @ValidateIf((o) => o.fixerUserId !== undefined && o.fixerUserId !== null && o.fixerUserId !== '')
  @IsUUID()
  fixerUserId?: string;

  @ApiPropertyOptional({ description: 'Target Quote UUID' })
  @IsOptional()
  @ValidateIf((o) => o.quoteId !== undefined && o.quoteId !== null && o.quoteId !== '')
  @IsUUID()
  quoteId?: string;

  @ApiPropertyOptional({ description: 'Target Other User UUID' })
  @IsOptional()
  @ValidateIf((o) => o.otherUserId !== undefined && o.otherUserId !== null && o.otherUserId !== '')
  @IsUUID()
  otherUserId?: string;

  @ApiPropertyOptional({ example: 'Hello! I would like to discuss the repair.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}

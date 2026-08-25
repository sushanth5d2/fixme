import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';
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
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Repair Request UUID to link conversation to' })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiPropertyOptional({ description: 'Target Fixer UUID' })
  @IsOptional()
  @IsUUID()
  fixerId?: string;

  @ApiPropertyOptional({ description: 'Target Fixer User UUID' })
  @IsOptional()
  @IsUUID()
  fixerUserId?: string;

  @ApiPropertyOptional({ description: 'Target Quote UUID' })
  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @ApiPropertyOptional({ description: 'Target Other User UUID' })
  @IsOptional()
  @IsUUID()
  otherUserId?: string;

  @ApiPropertyOptional({ example: 'Hello! I would like to discuss the repair.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}

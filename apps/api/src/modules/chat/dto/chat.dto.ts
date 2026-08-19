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
  @ApiProperty({ description: 'Job UUID to link conversation to' })
  @IsUUID()
  jobId!: string;

  @ApiPropertyOptional({ example: 'Hello! I would like to discuss the repair.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}

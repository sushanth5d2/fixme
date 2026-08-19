import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@fixme/shared-types';
import { SendMessageDto, CreateConversationDto } from './dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a conversation for a job (or return existing)' })
  public createConversation(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(userId, dto);
  }

  @Get('conversations')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @ApiOperation({ summary: 'List my conversations' })
  public getMyConversations(@CurrentUser('sub') userId: string) {
    return this.chatService.getMyConversations(userId);
  }

  @Post('messages')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message' })
  public sendMessage(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, dto);
  }

  @Get('conversations/:conversationId/messages')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @ApiOperation({ summary: 'Get messages in a conversation (paginated, newest first)' })
  @ApiParam({ name: 'conversationId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getMessages(
    @CurrentUser('sub') userId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getMessages(userId, conversationId, Number(page), Math.min(Number(limit), 100));
  }

  @Patch('conversations/:conversationId/read')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'conversationId', type: 'string', format: 'uuid' })
  public markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.chatService.markAsRead(userId, conversationId);
  }
}

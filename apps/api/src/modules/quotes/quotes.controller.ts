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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@fixme/shared-types';
import { SubmitQuoteDto, AcceptQuoteDto } from './dto/quote.dto';

@ApiTags('quotes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'quotes', version: '1' })
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Fixer] Submit a quote for a repair request' })
  public submit(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitQuoteDto,
  ) {
    return this.quotesService.submit(userId, dto);
  }

  @Patch(':quoteId/accept')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: '[Customer] Accept a quote (creates a job, rejects other quotes)' })
  @ApiParam({ name: 'quoteId', type: 'string', format: 'uuid' })
  public accept(
    @CurrentUser('sub') userId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() dto: AcceptQuoteDto,
  ) {
    return this.quotesService.accept(userId, quoteId, dto);
  }

  @Patch(':quoteId/withdraw')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] Withdraw a submitted quote' })
  @ApiParam({ name: 'quoteId', type: 'string', format: 'uuid' })
  public withdraw(
    @CurrentUser('sub') userId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ) {
    return this.quotesService.withdraw(userId, quoteId);
  }

  @Get('request/:requestId')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all quotes for a repair request' })
  @ApiParam({ name: 'requestId', type: 'string', format: 'uuid' })
  public getQuotesForRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.quotesService.getQuotesForRequest(requestId);
  }

  @Get('request/:requestId/mine')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] Get my submitted quote for a repair request' })
  @ApiParam({ name: 'requestId', type: 'string', format: 'uuid' })
  public getMyQuoteForRequest(
    @CurrentUser('sub') userId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.quotesService.getMyQuoteForRequest(userId, requestId);
  }

  @Get('mine')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] List my submitted quotes' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getMyQuotes(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.quotesService.getMyQuotes(userId, Number(page), Math.min(Number(limit), 100));
  }
}

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
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@fixme/shared-types';
import { CreateReviewDto } from './dto/review.dto';

@ApiTags('reviews')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('job/:jobId')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Customer] Submit a review for a completed job' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  public create(
    @CurrentUser('sub') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, jobId, dto);
  }

  @Get('fixer/:fixerId')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get reviews for a fixer' })
  @ApiParam({ name: 'fixerId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getFixerReviews(
    @Param('fixerId', ParseUUIDPipe) fixerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reviewsService.getFixerReviews(fixerId, Number(page), Math.min(Number(limit), 100));
  }

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] List all reviews for moderation' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public listForAdmin(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.reviewsService.listForAdmin(Number(page), Math.min(Number(limit), 100));
  }

  @Patch([':reviewId/hide', 'admin/:reviewId/hide'])
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Hide a review' })
  @ApiParam({ name: 'reviewId', type: 'string', format: 'uuid' })
  public hide(@Param('reviewId', ParseUUIDPipe) reviewId: string) {
    return this.reviewsService.hide(reviewId);
  }

  @Patch([':reviewId/restore', 'admin/:reviewId/restore'])
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Restore a hidden review' })
  @ApiParam({ name: 'reviewId', type: 'string', format: 'uuid' })
  public restore(@Param('reviewId', ParseUUIDPipe) reviewId: string) {
    return this.reviewsService.restore(reviewId);
  }
}

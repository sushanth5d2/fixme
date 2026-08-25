import {
  Controller,
  Get,
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
import { JobsService } from './jobs.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@fixme/shared-types';
import { UpdateJobStatusDto, CancelJobDto, ScheduleJobDto } from './dto/job.dto';

@ApiTags('jobs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Patch(':jobId/status')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] Update job status (state machine enforced)' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  public updateStatus(
    @CurrentUser('sub') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateStatus(userId, jobId, dto);
  }

  @Patch(':jobId/cancel')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a job (both customer and fixer can cancel before repair starts)' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  public cancel(
    @CurrentUser('sub') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CancelJobDto,
  ) {
    return this.jobsService.cancel(userId, jobId, dto);
  }

  @Patch(':jobId/schedule')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] Schedule a job date/time' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  public schedule(
    @CurrentUser('sub') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: ScheduleJobDto,
  ) {
    return this.jobsService.schedule(userId, jobId, dto);
  }

  @Get(['mine/fixer', 'fixer/mine'])
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] List my assigned jobs' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getMyFixerJobs(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.jobsService.getMyJobs(userId, 'fixer', Number(page), Math.min(Number(limit), 100));
  }

  @Get(['mine/customer', 'customer/mine'])
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: '[Customer] List my jobs' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getMyCustomerJobs(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.jobsService.getMyJobs(userId, 'customer', Number(page), Math.min(Number(limit), 100));
  }

  @Get(':jobId')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get job details (only owner or admin)' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  public getJobById(
    @CurrentUser('sub') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.jobsService.getJobById(userId, jobId);
  }
}

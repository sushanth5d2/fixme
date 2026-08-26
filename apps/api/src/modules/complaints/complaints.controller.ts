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
import { ComplaintsService } from './complaints.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole, ComplaintStatus } from '@fixme/shared-types';
import { CreateComplaintDto, UpdateComplaintStatusDto } from './dto/complaint.dto';

@ApiTags('complaints')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'complaints', version: '1' })
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'File a complaint about a job' })
  public create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.complaintsService.create(userId, dto);
  }

  @Get('mine')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @ApiOperation({ summary: 'List my complaints (filed by or against me)' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getMyComplaints(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.complaintsService.getMyComplaints(userId, Number(page), Math.min(Number(limit), 100));
  }

  @Get('mine/:complaintId')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER)
  @ApiOperation({ summary: 'Get complaint details' })
  @ApiParam({ name: 'complaintId', type: 'string', format: 'uuid' })
  public getById(
    @CurrentUser('sub') userId: string,
    @Param('complaintId', ParseUUIDPipe) complaintId: string,
  ) {
    return this.complaintsService.getById(userId, complaintId);
  }

  @Get('admin')
  @Public()
  @ApiOperation({ summary: '[Admin] List all complaints' })
  @ApiQuery({ name: 'status', required: false, enum: ComplaintStatus })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getAllForAdmin(
    @Query('status') status?: ComplaintStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.complaintsService.getAllForAdmin(status, Number(page), Math.min(Number(limit), 100));
  }

  @Patch('admin/:complaintId')
  @Public()
  @ApiOperation({ summary: '[Admin] Update complaint status / resolve' })
  @ApiParam({ name: 'complaintId', type: 'string', format: 'uuid' })
  public updateStatus(
    @CurrentUser('sub') adminUserId: string,
    @Param('complaintId', ParseUUIDPipe) complaintId: string,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    return this.complaintsService.updateStatus(adminUserId || '00000000-0000-0000-0000-000000000001', complaintId, dto);
  }
}

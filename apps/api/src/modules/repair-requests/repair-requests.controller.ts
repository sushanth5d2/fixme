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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RepairRequestsService } from './repair-requests.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole, RequestStatus } from '@fixme/shared-types';
import { CreateRepairRequestDto, CancelRepairRequestDto } from './dto/repair-request.dto';

@ApiTags('repair-requests')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'repair-requests', version: '1' })
export class RepairRequestsController {
  constructor(private readonly repairRequestsService: RepairRequestsService) {}

  // ── Customer Endpoints ─────────────────────────────────────

  @Post()
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new repair request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  public create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRepairRequestDto,
  ) {
    return this.repairRequestsService.create(userId, dto);
  }

  @Get('mine')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'List my repair requests (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getMyRequests(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.repairRequestsService.getMyRequests(userId, Number(page), Math.min(Number(limit), 100));
  }

  @Get('mine/:requestId')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get one of my repair requests (full details)' })
  @ApiParam({ name: 'requestId', type: 'string', format: 'uuid' })
  public getMyRequestById(
    @CurrentUser('sub') userId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.repairRequestsService.getMyRequestById(userId, requestId);
  }

  @Patch('mine/:requestId/cancel')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an open or quotes-received repair request' })
  @ApiParam({ name: 'requestId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 400, description: 'Cannot cancel once a job is in progress' })
  public cancel(
    @CurrentUser('sub') userId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: CancelRepairRequestDto,
  ) {
    return this.repairRequestsService.cancel(userId, requestId, dto);
  }

  // ── Fixer Endpoints ────────────────────────────────────────

  @Get('feed')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] Browse open repair requests (privacy-gated: no PII)' })
  @ApiQuery({ name: 'categoryId', required: false, type: 'string' })
  @ApiQuery({ name: 'brandId', required: false, type: 'string' })
  @ApiQuery({ name: 'city', required: false, type: 'string' })
  @ApiQuery({ name: 'pincode', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getFixerFeed(
    @CurrentUser('sub') fixerUserId: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('city') city?: string,
    @Query('pincode') pincode?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.repairRequestsService.getFixerFeed({
      fixerUserId,
      categoryId,
      brandId,
      city,
      pincode,
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });
  }

  @Get('feed/:requestId')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: '[Fixer] Get request details for quoting (no customer PII)' })
  @ApiParam({ name: 'requestId', type: 'string', format: 'uuid' })
  public getRequestDetailForFixer(
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.repairRequestsService.getRequestDetailForFixer(requestId);
  }

  // ── Admin Endpoints ────────────────────────────────────────

  @Get('admin')
  @Public()
  @ApiOperation({ summary: '[Admin] List all repair requests' })
  @ApiQuery({ name: 'status', required: false, enum: RequestStatus })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public getAllForAdmin(
    @Query('status') status?: RequestStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.repairRequestsService.getAllForAdmin(status, Number(page), Math.min(Number(limit), 100));
  }
}

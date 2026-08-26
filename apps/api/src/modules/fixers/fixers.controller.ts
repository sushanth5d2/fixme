import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { FixersService } from './fixers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole, FixerVerificationStatus } from '@fixme/shared-types';
import {
  RegisterFixerDto,
  UpdateFixerProfileDto,
  AddFixerServiceDto,
  AddFixerServiceAreaDto,
  VerifyFixerDto,
} from './dto/fixer.dto';

@ApiTags('fixers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'fixers', version: '1' })
export class FixersController {
  constructor(private readonly fixersService: FixersService) {}

  // ── Fixer Self-Service ─────────────────────────────────────

  @Post('register')
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Complete fixer business registration' })
  @ApiResponse({ status: 201, description: 'Fixer registered. Verification pending.' })
  @ApiResponse({ status: 409, description: 'Profile already exists or GSTIN taken' })
  public register(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterFixerDto,
  ) {
    return this.fixersService.register(userId, dto);
  }

  @Get('me')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: 'Get own fixer profile with services and areas' })
  public getMyProfile(@CurrentUser('sub') userId: string) {
    return this.fixersService.getMyProfile(userId);
  }

  @Patch('me')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: 'Update own fixer profile' })
  public updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateFixerProfileDto,
  ) {
    return this.fixersService.updateProfile(userId, dto);
  }

  // ── Services (categories + brands) ────────────────────────

  @Post('me/services')
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a device category/brand to offered services' })
  public addService(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddFixerServiceDto,
  ) {
    return this.fixersService.addService(userId, dto);
  }

  @Delete('me/services/:serviceId')
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an offered service' })
  @ApiParam({ name: 'serviceId', type: 'string', format: 'uuid' })
  public removeService(
    @CurrentUser('sub') userId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.fixersService.removeService(userId, serviceId);
  }

  // ── Service Areas ──────────────────────────────────────────

  @Post('me/service-areas')
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a service area (pincode, city, or radius)' })
  public addServiceArea(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddFixerServiceAreaDto,
  ) {
    return this.fixersService.addServiceArea(userId, dto);
  }

  @Delete('me/service-areas/:areaId')
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a service area' })
  @ApiParam({ name: 'areaId', type: 'string', format: 'uuid' })
  public removeServiceArea(
    @CurrentUser('sub') userId: string,
    @Param('areaId', ParseUUIDPipe) areaId: string,
  ) {
    return this.fixersService.removeServiceArea(userId, areaId);
  }

  // ── Fixer Team Members / Staff ──────────────────────────────

  @Post('me/members')
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new team member / technician' })
  public createMember(
    @CurrentUser('sub') userId: string,
    @Body()
    dto: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      profilePhotoKey?: string;
    },
  ) {
    return this.fixersService.createMember(userId, dto);
  }

  @Get('me/members')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: 'List all team members / technicians' })
  public getMembers(@CurrentUser('sub') userId: string) {
    return this.fixersService.getMembers(userId);
  }

  @Delete('me/members/:memberId')
  @Roles(UserRole.FIXER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a team member' })
  @ApiParam({ name: 'memberId', type: 'string', format: 'uuid' })
  public deleteMember(
    @CurrentUser('sub') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.fixersService.deleteMember(userId, memberId);
  }

  @Patch('me/members/:memberId/password')
  @Roles(UserRole.FIXER)
  @ApiOperation({ summary: 'Reset or change password for a team member' })
  @ApiParam({ name: 'memberId', type: 'string', format: 'uuid' })
  public resetMemberPassword(
    @CurrentUser('sub') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: { password: string },
  ) {
    return this.fixersService.resetMemberPassword(userId, memberId, dto.password);
  }

  @Get('me/member-profile')
  @Roles(UserRole.FIXER_MEMBER, UserRole.FIXER)
  @ApiOperation({ summary: 'Get current logged-in staff member profile' })
  public getMyMemberProfile(@CurrentUser('sub') userId: string) {
    return this.fixersService.getMyMemberProfile(userId);
  }

  // ── Public Endpoints ───────────────────────────────────────

  @Get('search')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Search fixers by name, location, city, pincode, category, or brand' })
  @ApiQuery({ name: 'query', required: false, type: 'string' })
  @ApiQuery({ name: 'name', required: false, type: 'string' })
  @ApiQuery({ name: 'location', required: false, type: 'string' })
  @ApiQuery({ name: 'categoryId', required: false, type: 'string' })
  @ApiQuery({ name: 'brandId', required: false, type: 'string' })
  @ApiQuery({ name: 'city', required: false, type: 'string' })
  @ApiQuery({ name: 'pincode', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 20 })
  public search(
    @Query('query') queryParam?: string,
    @Query('name') name?: string,
    @Query('location') location?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('city') city?: string,
    @Query('pincode') pincode?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.fixersService.search({
      query: queryParam,
      name,
      location,
      categoryId,
      brandId,
      city,
      pincode,
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });
  }

  // ── Admin Operations (MUST be defined before :fixerId wildcard) ──

  @Get(['admin', 'admin/list'])
  @Public()
  @ApiOperation({ summary: '[Admin] List fixers with optional status filter' })
  @ApiQuery({ name: 'status', required: false, enum: FixerVerificationStatus })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  public listForAdmin(
    @Query('status') status?: FixerVerificationStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.fixersService.listForAdmin(status, Number(page), Math.min(Number(limit), 100));
  }

  @Patch(['admin/:fixerId/verify', ':fixerId/verify'])
  @Public()
  @ApiOperation({ summary: '[Admin] Approve or reject a fixer verification' })
  @ApiParam({ name: 'fixerId', type: 'string', format: 'uuid' })
  public verifyFixer(
    @Param('fixerId', ParseUUIDPipe) fixerId: string,
    @CurrentUser('sub') adminUserId: string,
    @Body() dto: VerifyFixerDto,
  ) {
    return this.fixersService.verifyFixer(fixerId, adminUserId || '00000000-0000-0000-0000-000000000001', dto);
  }

  // ── Public Endpoints ───────────────────────────────────────

  @Get(':fixerId')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get public profile of a verified fixer' })
  @ApiParam({ name: 'fixerId', type: 'string', format: 'uuid' })
  public getPublicProfile(@Param('fixerId', ParseUUIDPipe) fixerId: string) {
    return this.fixersService.getPublicProfile(fixerId);
  }
}

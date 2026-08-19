import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BrandsService, CreateBrandDto } from './brands.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@fixme/shared-types';

@ApiTags('brands')
@Controller({ path: 'brands', version: '1' })
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active device brands' })
  public findAll() {
    return this.brandsService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a brand by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  public findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Create a device brand' })
  public create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Update a device brand' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  public update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateBrandDto>,
  ) {
    return this.brandsService.update(id, dto);
  }
}

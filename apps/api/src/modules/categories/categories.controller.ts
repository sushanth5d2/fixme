import { Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CategoriesService, CreateCategoryDto } from './categories.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@fixme/shared-types';

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active device categories' })
  public findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  public findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Create a device category' })
  public create(@Body() dto: Partial<CreateCategoryDto> & { name: string }) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Public()
  @ApiOperation({ summary: '[Admin] Update a device category' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  public update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCategoryDto>,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Public()
  @ApiOperation({ summary: '[Admin] Delete a device category' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  public delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.delete(id);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get(['stats', 'overview'])
  @Public()
  @ApiOperation({ summary: 'Get live overview statistics for Admin Dashboard' })
  public getStats() {
    return this.adminService.getDashboardStats();
  }
}

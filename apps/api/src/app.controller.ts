import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root status and links' })
  getRoot() {
    return {
      name: 'Fix Me API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/health/live',
      baseEndpoint: '/api/v1',
    };
  }

  @Get('api')
  @ApiOperation({ summary: 'API Root status and links' })
  getApiRoot() {
    return this.getRoot();
  }
}

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@fixme/shared-types';
import {
  UpdateCustomerProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ── Profile ────────────────────────────────────────────────

  @Get('me')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get own customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile' })
  public getMyProfile(@CurrentUser('sub') userId: string) {
    return this.customersService.getProfile(userId);
  }

  @Patch('me')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Update own customer profile' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  public updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customersService.updateProfile(userId, dto);
  }

  @Get(':customerId/public')
  @Roles(UserRole.CUSTOMER, UserRole.FIXER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get limited public view of a customer (first name only)' })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid' })
  public getPublicProfile(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.customersService.getPublicProfile(customerId);
  }

  // ── Addresses ──────────────────────────────────────────────

  @Get('me/addresses')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'List all saved addresses' })
  @ApiResponse({ status: 200, description: 'Address list' })
  public listAddresses(@CurrentUser('sub') userId: string) {
    return this.customersService.listAddresses(userId);
  }

  @Post('me/addresses')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  @ApiResponse({ status: 400, description: 'Max address limit reached' })
  public createAddress(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customersService.createAddress(userId, dto);
  }

  @Get('me/addresses/:addressId')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get a specific address' })
  @ApiParam({ name: 'addressId', type: 'string', format: 'uuid' })
  public getAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.customersService.getAddress(userId, addressId);
  }

  @Patch('me/addresses/:addressId')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'addressId', type: 'string', format: 'uuid' })
  public updateAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.customersService.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an address (soft-delete)' })
  @ApiParam({ name: 'addressId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 400, description: 'Cannot delete default address' })
  public deleteAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.customersService.deleteAddress(userId, addressId);
  }

  @Patch('me/addresses/:addressId/set-default')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Set an address as default' })
  @ApiParam({ name: 'addressId', type: 'string', format: 'uuid' })
  public setDefaultAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.customersService.setDefaultAddress(userId, addressId);
  }
}

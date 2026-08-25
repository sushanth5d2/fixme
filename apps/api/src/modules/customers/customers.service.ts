import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { AddressEntity } from './address.entity';
import { UserEntity } from '../users/user.entity';
import {
  UpdateCustomerProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/customer.dto';

const MAX_ADDRESSES = 10;

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,

    @InjectRepository(AddressEntity)
    private readonly addressRepo: Repository<AddressEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly dataSource: DataSource,
  ) {}

  // ── Profile ────────────────────────────────────────────────

  public async getProfile(userId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return customer;
  }

  public async updateProfile(
    userId: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerEntity> {
    const customer = await this.findCustomerOrFail(userId);

    if (dto.firstName !== undefined) customer.firstName = dto.firstName;
    if (dto.lastName !== undefined) customer.lastName = dto.lastName;

    await this.customerRepo.save(customer);
    this.logger.log(`Customer profile updated: ${userId}`);
    return customer;
  }

  public async getPublicProfile(customerId: string): Promise<{
    firstName: string;
    createdAt: Date;
  }> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return {
      firstName: customer.firstName,
      createdAt: customer.createdAt,
    };
  }

  // ── Addresses ──────────────────────────────────────────────

  public async listAddresses(userId: string): Promise<AddressEntity[]> {
    const customer = await this.findCustomerOrFail(userId);
    return this.addressRepo.find({
      where: { customerId: customer.id },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  public async createAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressEntity> {
    const customer = await this.findCustomerOrFail(userId);

    const existing = await this.addressRepo.count({
      where: { customerId: customer.id },
    });
    if (existing >= MAX_ADDRESSES) {
      throw new BadRequestException(
        `Maximum of ${MAX_ADDRESSES} addresses allowed. Please delete an existing address first.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // If this address is marked default, unset others
      if (dto.isDefault) {
        await manager.update(
          AddressEntity,
          { customerId: customer.id },
          { isDefault: false },
        );
      }

      const isFirstAddress = existing === 0;
      const address = manager.create(AddressEntity, {
        customerId: customer.id,
        type: dto.type,
        houseBuilding: dto.houseBuilding,
        street: dto.street,
        area: dto.area,
        landmark: dto.landmark ?? null,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        isDefault: dto.isDefault ?? isFirstAddress,
      });
      return manager.save(address);
    });
  }

  public async getAddress(userId: string, addressId: string): Promise<AddressEntity> {
    const customer = await this.findCustomerOrFail(userId);
    return this.findAddressOrFail(addressId, customer.id);
  }

  public async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressEntity> {
    const customer = await this.findCustomerOrFail(userId);
    const address = await this.findAddressOrFail(addressId, customer.id);

    return this.dataSource.transaction(async (manager) => {
      if (dto.isDefault === true) {
        await manager.update(
          AddressEntity,
          { customerId: customer.id },
          { isDefault: false },
        );
      }

      Object.assign(address, {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.houseBuilding !== undefined && { houseBuilding: dto.houseBuilding }),
        ...(dto.street !== undefined && { street: dto.street }),
        ...(dto.area !== undefined && { area: dto.area }),
        ...(dto.landmark !== undefined && { landmark: dto.landmark }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.pincode !== undefined && { pincode: dto.pincode }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      });

      return manager.save(address);
    });
  }

  public async deleteAddress(userId: string, addressId: string): Promise<{ message: string }> {
    const customer = await this.findCustomerOrFail(userId);
    const address = await this.findAddressOrFail(addressId, customer.id);

    await this.dataSource.transaction(async (manager) => {
      await manager.softDelete(AddressEntity, addressId);

      // If the deleted address was default, promote the newest remaining address if one exists
      if (address.isDefault) {
        const nextAddress = await manager.findOne(AddressEntity, {
          where: { customerId: customer.id, deletedAt: IsNull() },
          order: { createdAt: 'DESC' },
        });
        if (nextAddress) {
          nextAddress.isDefault = true;
          await manager.save(nextAddress);
        }
      }
    });

    this.logger.log(`Address deleted: ${addressId} by customer: ${userId}`);
    return { message: 'Address deleted successfully' };
  }

  public async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressEntity> {
    const customer = await this.findCustomerOrFail(userId);
    const address = await this.findAddressOrFail(addressId, customer.id);

    return this.dataSource.transaction(async (manager) => {
      await manager.update(AddressEntity, { customerId: customer.id }, { isDefault: false });
      address.isDefault = true;
      return manager.save(address);
    });
  }

  // ── Internal Helpers ───────────────────────────────────────

  public async findCustomerOrFail(userId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');
    return customer;
  }

  private async findAddressOrFail(
    addressId: string,
    customerId: string,
  ): Promise<AddressEntity> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RequestStatus, UserRole } from '@fixme/shared-types';
import { RepairRequestEntity } from './repair-request.entity';
import { RepairRequestMediaEntity } from './repair-request-media.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { AddressEntity } from '../customers/address.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';
import {
  CreateRepairRequestDto,
  CancelRepairRequestDto,
} from './dto/repair-request.dto';

// Only these statuses allow cancellation by the customer
const CANCELLABLE_STATUSES = [
  RequestStatus.OPEN,
  RequestStatus.QUOTED,
];

// Statuses that fixers can see
const FIXER_VISIBLE_STATUSES = [
  RequestStatus.OPEN,
  RequestStatus.QUOTED,
];

@Injectable()
export class RepairRequestsService {
  private readonly logger = new Logger(RepairRequestsService.name);

  constructor(
    @InjectRepository(RepairRequestEntity)
    private readonly requestRepo: Repository<RepairRequestEntity>,

    @InjectRepository(RepairRequestMediaEntity)
    private readonly mediaRepo: Repository<RepairRequestMediaEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,

    @InjectRepository(AddressEntity)
    private readonly addressRepo: Repository<AddressEntity>,

    @InjectRepository(DeviceCategoryEntity)
    private readonly categoryRepo: Repository<DeviceCategoryEntity>,

    @InjectRepository(DeviceBrandEntity)
    private readonly brandRepo: Repository<DeviceBrandEntity>,

    private readonly dataSource: DataSource,
  ) {}

  // ── Create ─────────────────────────────────────────────────

  public async create(
    userId: string,
    dto: CreateRepairRequestDto,
  ): Promise<RepairRequestEntity> {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId, isActive: true },
    });
    if (!category) throw new NotFoundException('Device category not found');

    if (dto.brandId) {
      const brand = await this.brandRepo.findOne({ where: { id: dto.brandId, isActive: true } });
      if (!brand) throw new NotFoundException('Device brand not found');
    }

    let addressSnapshot: Record<string, unknown> | null = null;
    if (dto.addressId) {
      const address = await this.addressRepo.findOne({
        where: { id: dto.addressId, customerId: customer.id },
      });
      if (!address) throw new NotFoundException('Address not found');

      // Snapshot the address at creation time
      addressSnapshot = {
        houseBuilding: address.houseBuilding,
        street: address.street,
        area: address.area,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        latitude: address.latitude,
        longitude: address.longitude,
      };
    }

    const request = this.requestRepo.create({
      customerId: customer.id,
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
      deviceModel: dto.deviceModel ?? null,
      description: dto.description,
      priority: dto.priority,
      addressId: dto.addressId ?? null,
      addressSnapshot,
      latitude: (addressSnapshot?.latitude as number) ?? null,
      longitude: (addressSnapshot?.longitude as number) ?? null,
      preferredDate: dto.preferredDate ?? null,
      preferredTimeSlot: dto.preferredTimeSlot ?? null,
      status: RequestStatus.OPEN,
    });

    const saved = await this.requestRepo.save(request);
    this.logger.log(`Repair request created: ${saved.id} by customer: ${customer.id}`);
    return saved;
  }

  // ── Customer: Own Requests ─────────────────────────────────

  public async getMyRequests(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: RepairRequestEntity[]; total: number }> {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const [data, total] = await this.requestRepo.findAndCount({
      where: { customerId: customer.id },
      relations: ['category', 'brand', 'media'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  public async getMyRequestById(
    userId: string,
    requestId: string,
  ): Promise<RepairRequestEntity> {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const request = await this.requestRepo.findOne({
      where: { id: requestId, customerId: customer.id },
      relations: ['category', 'brand', 'media', 'address'],
    });
    if (!request) throw new NotFoundException('Repair request not found');
    return request;
  }

  public async cancel(
    userId: string,
    requestId: string,
    dto: CancelRepairRequestDto,
  ): Promise<RepairRequestEntity> {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const request = await this.requestRepo.findOne({
      where: { id: requestId, customerId: customer.id },
    });
    if (!request) throw new NotFoundException('Repair request not found');

    if (!CANCELLABLE_STATUSES.includes(request.status)) {
      throw new BadRequestException(
        `Cannot cancel a request with status: ${request.status}. Only OPEN or QUOTES_RECEIVED requests can be cancelled.`,
      );
    }

    request.status = RequestStatus.CANCELLED;
    request.cancelledAt = new Date();
    request.cancellationReason = dto.reason ?? null;
    await this.requestRepo.save(request);

    this.logger.log(`Repair request cancelled: ${requestId}`);
    return request;
  }

  // ── Fixer: Feed ────────────────────────────────────────────

  /**
   * Returns open/quotes-received requests visible to fixers.
   * Privacy rule: NO customer contact details are exposed here.
   * Only city, pincode, device category/brand, and description are returned.
   */
  public async getFixerFeed(params: {
    fixerUserId: string;
    categoryId?: string;
    brandId?: string;
    city?: string;
    pincode?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Partial<RepairRequestEntity>[]; total: number }> {
    const { categoryId, brandId, city, pincode, page = 1, limit = 20 } = params;

    const query = this.requestRepo
      .createQueryBuilder('req')
      .select([
        'req.id',
        'req.categoryId',
        'req.brandId',
        'req.deviceModel',
        'req.description',
        'req.priority',
        'req.status',
        'req.preferredDate',
        'req.preferredTimeSlot',
        'req.createdAt',
        // Only safe location info — area/city/pincode, NOT full address or GPS
      ])
      .addSelect('cat.name', 'categoryName')
      .addSelect('brand.name', 'brandName')
      .leftJoin('req.category', 'cat')
      .leftJoin('req.brand', 'brand')
      .where('req.status IN (:...statuses)', { statuses: FIXER_VISIBLE_STATUSES })
      .andWhere('req.deleted_at IS NULL');

    if (categoryId) {
      query.andWhere('req.category_id = :categoryId', { categoryId });
    }
    if (brandId) {
      query.andWhere('(req.brand_id = :brandId OR req.brand_id IS NULL)', { brandId });
    }
    if (city) {
      query.andWhere("req.address_snapshot->>'city' ILIKE :city", { city: `%${city}%` });
    }
    if (pincode) {
      query.andWhere("req.address_snapshot->>'pincode' = :pincode", { pincode });
    }

    query.orderBy('req.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    // Map to safe DTO — strip any PII
    const safeData = data.map((req) => ({
      id: req.id,
      categoryId: req.categoryId,
      brandId: req.brandId,
      deviceModel: req.deviceModel,
      description: req.description,
      priority: req.priority,
      status: req.status,
      // Only broad location — city+pincode from snapshot
      city: (req.addressSnapshot as Record<string, unknown> | null)?.['city'] ?? null,
      pincode: (req.addressSnapshot as Record<string, unknown> | null)?.['pincode'] ?? null,
      preferredDate: req.preferredDate,
      preferredTimeSlot: req.preferredTimeSlot,
      createdAt: req.createdAt,
    }));

    return { data: safeData, total };
  }

  public async getRequestDetailForFixer(
    requestId: string,
  ): Promise<Partial<RepairRequestEntity>> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['category', 'brand', 'media'],
    });
    if (!request) throw new NotFoundException('Repair request not found');
    if (!FIXER_VISIBLE_STATUSES.includes(request.status)) {
      throw new ForbiddenException('This request is no longer available');
    }

    // Return details but NO customer contact info
    return {
      id: request.id,
      category: request.category,
      brand: request.brand,
      deviceModel: request.deviceModel,
      description: request.description,
      priority: request.priority,
      status: request.status,
      media: request.media,
      preferredDate: request.preferredDate,
      preferredTimeSlot: request.preferredTimeSlot,
      createdAt: request.createdAt,
      // Only area/city/pincode — NOT full address or GPS
      addressSnapshot: request.addressSnapshot
        ? {
            area: (request.addressSnapshot as Record<string, unknown>)['area'],
            city: (request.addressSnapshot as Record<string, unknown>)['city'],
            pincode: (request.addressSnapshot as Record<string, unknown>)['pincode'],
          }
        : null,
    };
  }

  // ── Admin ──────────────────────────────────────────────────

  public async getAllForAdmin(
    status?: RequestStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: RepairRequestEntity[]; total: number }> {
    const query = this.requestRepo.createQueryBuilder('req');
    if (status) query.where('req.status = :status', { status });
    query.leftJoinAndSelect('req.category', 'cat');
    query.leftJoinAndSelect('req.brand', 'brand');
    query.orderBy('req.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }
}

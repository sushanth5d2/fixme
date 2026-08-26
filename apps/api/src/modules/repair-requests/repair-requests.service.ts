import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RequestStatus, UserRole, UrgencyLevel, MediaType } from '@fixme/shared-types';
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
export class RepairRequestsService implements OnModuleInit {
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

  public async onModuleInit() {
    try {
      await this.dataSource.query(`
        ALTER TABLE problem_request_media ALTER COLUMN storage_key TYPE TEXT;
      `);
      this.logger.log('Upgraded problem_request_media.storage_key column to TEXT');
    } catch (err: any) {
      this.logger.warn(`Could not alter storage_key column: ${err?.message}`);
    }
  }

  // ── Create ─────────────────────────────────────────────────

  public async create(
    userId: string,
    dto: CreateRepairRequestDto,
  ): Promise<RepairRequestEntity> {
    try {
      let customer = await this.customerRepo.findOne({ where: { userId } });
      if (!customer) {
        this.logger.log(`Customer profile missing for user ${userId}, auto-creating...`);
        customer = await this.customerRepo.save(
          this.customerRepo.create({
            userId,
            firstName: 'Customer',
            lastName: '',
          }),
        );
      }

      let category = await this.categoryRepo.findOne({
        where: [{ id: dto.categoryId }, { slug: dto.categoryId }],
      });

      if (!category) {
        // Auto-create category if missing
        category = await this.categoryRepo.save(
          this.categoryRepo.create({
            name: dto.categoryId.charAt(0).toUpperCase() + dto.categoryId.slice(1),
            slug: dto.categoryId.toLowerCase(),
            isActive: true,
          }),
        );
      }

      if (dto.brandId) {
        const brand = await this.brandRepo.findOne({ where: { id: dto.brandId, isActive: true } });
        if (!brand) throw new NotFoundException('Device brand not found');
      }

      let addressSnapshot: Record<string, unknown> | null = null;
      let finalAddressId = dto.addressId ?? null;

      if (dto.addressId) {
        const address = await this.addressRepo.findOne({
          where: { id: dto.addressId, customerId: customer.id },
        });
        if (address) {
          addressSnapshot = {
            houseBuilding: address.houseBuilding,
            street: address.street,
            area: address.area,
            landmark: address.landmark,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            contactNumber: dto.contactNumber || null,
            latitude: address.latitude,
            longitude: address.longitude,
          };
        }
      } else if (dto.houseBuilding || dto.street || dto.pincode || dto.city) {
        // Inline address provided
        addressSnapshot = {
          houseBuilding: dto.houseBuilding || '',
          street: dto.street || '',
          area: dto.area || '',
          landmark: dto.landmark || '',
          city: dto.city || '',
          state: dto.state || '',
          pincode: dto.pincode || '',
          contactNumber: dto.contactNumber || null,
        };

        // Also persist as a customer address so customer can reuse it
        try {
          const savedAddr = await this.addressRepo.save(
            this.addressRepo.create({
              customerId: customer.id,
              houseBuilding: dto.houseBuilding || 'Address',
              street: dto.street || '',
              area: dto.area || '',
              landmark: dto.landmark || '',
              city: dto.city || 'City',
              state: dto.state || 'State',
              pincode: dto.pincode || '000000',
              isDefault: true,
            }),
          );
          finalAddressId = savedAddr.id;
        } catch (addrErr) {
          this.logger.warn(`Could not save inline address to customer: ${addrErr}`);
        }
      }

      const lat = dto.latitude ?? (addressSnapshot?.latitude as number) ?? null;
      const lng = dto.longitude ?? (addressSnapshot?.longitude as number) ?? null;

      const title = dto.deviceModel
        ? `${category.name} - ${dto.deviceModel}`
        : `${category.name} Repair Request`;

      const request = this.requestRepo.create({
        customerId: customer.id,
        categoryId: category.id, // Must be UUID of the category
        brandId: dto.brandId ?? null,
        deviceModel: dto.deviceModel ?? null,
        problemTitle: title.slice(0, 500),
        problemDescription: dto.description,
        urgency: dto.priority || UrgencyLevel.MEDIUM,
        addressId: finalAddressId,
        houseBuilding: (addressSnapshot?.houseBuilding as string) || dto.houseBuilding || null,
        street: (addressSnapshot?.street as string) || dto.street || null,
        area: (addressSnapshot?.area as string) || dto.area || null,
        landmark: (addressSnapshot?.landmark as string) || dto.landmark || null,
        city: (addressSnapshot?.city as string) || dto.city || 'Bengaluru',
        state: (addressSnapshot?.state as string) || dto.state || 'Karnataka',
        pincode: (addressSnapshot?.pincode as string) || dto.pincode || '560001',
        latitude: lat,
        longitude: lng,
        preferredDate: dto.preferredDate ?? null,
        preferredTime: dto.preferredTimeSlot ? `${dto.preferredTimeSlot === 'EVENING' ? '16:00:00' : dto.preferredTimeSlot === 'AFTERNOON' ? '12:00:00' : '09:00:00'}` : null,
        status: RequestStatus.OPEN,
      });

      const saved = await this.requestRepo.save(request);

      if (Array.isArray(dto.photos) && dto.photos.length > 0) {
        for (const photoUrl of dto.photos) {
          try {
            await this.mediaRepo.save(
              this.mediaRepo.create({
                requestId: saved.id,
                type: MediaType.PHOTO,
                storageKey: photoUrl,
                originalFilename: 'photo.jpg',
                mimeType: 'image/jpeg',
                sizeBytes: 1024,
              }),
            );
          } catch (mediaErr) {
            this.logger.warn(`Could not save request media: ${mediaErr}`);
          }
        }
      }

      this.logger.log(`Repair request created: ${saved.id} by customer: ${customer.id}`);
      return saved;
    } catch (err: any) {
      this.logger.error(`[Create Repair Request Error] ${err?.message || err}`, err?.stack);
      if (err instanceof NotFoundException || err instanceof BadRequestException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException(err?.message || 'Failed to create repair request');
    }
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
      .leftJoinAndSelect('req.category', 'cat')
      .leftJoinAndSelect('req.brand', 'brand')
      .leftJoinAndSelect('req.media', 'media')
      .where('req.status IN (:...statuses)', { statuses: FIXER_VISIBLE_STATUSES });

    if (categoryId) {
      query.andWhere('req.categoryId = :categoryId', { categoryId });
    }
    if (brandId) {
      query.andWhere('(req.brandId = :brandId OR req.brandId IS NULL)', { brandId });
    }
    if (city) {
      query.andWhere('req.city ILIKE :city', { city: `%${city}%` });
    }
    if (pincode) {
      query.andWhere('req.pincode = :pincode', { pincode });
    }

    query.orderBy('req.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    // Map to safe DTO
    const safeData = data.map((req) => ({
      id: req.id,
      categoryId: req.categoryId,
      brandId: req.brandId,
      category: req.category,
      brand: req.brand,
      media: req.media,
      deviceModel: req.deviceModel,
      problemTitle: req.problemTitle,
      problemDescription: req.problemDescription,
      description: req.problemDescription || req.description,
      priority: req.urgency || req.priority,
      urgency: req.urgency,
      status: req.status,
      houseBuilding: req.houseBuilding,
      street: req.street,
      area: req.area,
      landmark: req.landmark,
      city: req.city,
      state: req.state,
      pincode: req.pincode,
      latitude: req.latitude,
      longitude: req.longitude,
      addressSnapshot: {
        houseBuilding: req.houseBuilding,
        street: req.street,
        area: req.area,
        landmark: req.landmark,
        city: req.city,
        state: req.state,
        pincode: req.pincode,
        latitude: req.latitude,
        longitude: req.longitude,
      },
      preferredDate: req.preferredDate,
      preferredTime: req.preferredTime,
      createdAt: req.createdAt,
    }));

    return { data: safeData as any, total };
  }

  public async getRequestDetailForFixer(
    requestId: string,
  ): Promise<any> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['category', 'brand', 'media'],
    });
    if (!request) throw new NotFoundException('Repair request not found');

    return {
      id: request.id,
      categoryId: request.categoryId,
      brandId: request.brandId,
      category: request.category,
      brand: request.brand,
      deviceModel: request.deviceModel,
      problemTitle: request.problemTitle,
      problemDescription: request.problemDescription,
      description: request.problemDescription || request.description,
      priority: request.urgency || request.priority,
      urgency: request.urgency,
      status: request.status,
      media: request.media,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      createdAt: request.createdAt,
      houseBuilding: request.houseBuilding,
      street: request.street,
      area: request.area,
      landmark: request.landmark,
      city: request.city,
      state: request.state,
      pincode: request.pincode,
      latitude: request.latitude,
      longitude: request.longitude,
      addressSnapshot: {
        houseBuilding: request.houseBuilding,
        street: request.street,
        area: request.area,
        landmark: request.landmark,
        city: request.city,
        state: request.state,
        pincode: request.pincode,
        latitude: request.latitude,
        longitude: request.longitude,
      },
    };
  }

  // ── Admin ──────────────────────────────────────────────────

  public async getAllForAdmin(
    status?: RequestStatus,
    page = 1,
    limit = 50,
  ): Promise<{ data: any[]; total: number }> {
    const query = this.requestRepo.createQueryBuilder('req');
    if (status) query.where('req.status = :status', { status });
    query.leftJoinAndSelect('req.category', 'cat');
    query.leftJoinAndSelect('req.brand', 'brand');
    query.leftJoinAndSelect('req.customer', 'cust');
    query.leftJoinAndSelect('cust.user', 'user');
    query.orderBy('req.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();

    const mapped = data.map((r) => ({
      id: r.id,
      description: r.problemDescription || r.problemTitle || 'Repair Request',
      status: r.status,
      priority: r.urgency || 'STANDARD',
      deviceModel: r.deviceModel,
      category: r.category ? { name: r.category.name } : { name: 'Device' },
      brand: r.brand ? { name: r.brand.name } : null,
      customer: {
        email: r.customer?.user?.email || (r.customer as any)?.email || 'Customer',
        name: r.customer?.firstName ? `${r.customer.firstName} ${r.customer.lastName || ''}`.trim() : 'Customer',
      },
      createdAt: r.createdAt,
    }));

    return { data: mapped, total };
  }
}

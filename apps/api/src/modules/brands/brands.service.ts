import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceBrandEntity } from './device-brand.entity';

export class CreateBrandDto {
  name!: string;
  slug!: string;
}

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(DeviceBrandEntity)
    private readonly brandRepo: Repository<DeviceBrandEntity>,
  ) {}

  public async findAll(): Promise<DeviceBrandEntity[]> {
    return this.brandRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  public async findById(id: string): Promise<DeviceBrandEntity> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  public async create(dto: CreateBrandDto): Promise<DeviceBrandEntity> {
    const existing = await this.brandRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Brand slug already exists');
    const brand = this.brandRepo.create({ ...dto, isActive: true });
    return this.brandRepo.save(brand);
  }

  public async update(id: string, dto: Partial<CreateBrandDto>): Promise<DeviceBrandEntity> {
    const brand = await this.findById(id);
    Object.assign(brand, dto);
    return this.brandRepo.save(brand);
  }
}

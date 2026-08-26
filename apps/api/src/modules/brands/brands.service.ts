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

  public async create(dto: Partial<CreateBrandDto> & { name: string }): Promise<DeviceBrandEntity> {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.brandRepo.findOne({ where: { slug } });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.name = dto.name;
        return this.brandRepo.save(existing);
      }
      throw new ConflictException('Brand with this name/slug already exists');
    }
    const brand = this.brandRepo.create({ ...dto, slug, isActive: true });
    return this.brandRepo.save(brand);
  }

  public async update(id: string, dto: Partial<CreateBrandDto>): Promise<DeviceBrandEntity> {
    const brand = await this.findById(id);
    Object.assign(brand, dto);
    return this.brandRepo.save(brand);
  }
}

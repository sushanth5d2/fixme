import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceCategoryEntity } from './device-category.entity';

export class CreateCategoryDto {
  name!: string;
  slug!: string;
  sortOrder?: number;
}

const DEFAULT_CATEGORIES = [
  { name: 'Mobile / Smartphone', slug: 'phone', sortOrder: 1 },
  { name: 'Laptop / PC', slug: 'laptop', sortOrder: 2 },
  { name: 'Television (TV)', slug: 'tv', sortOrder: 3 },
  { name: 'Air Conditioner (AC)', slug: 'ac', sortOrder: 4 },
  { name: 'Washing Machine', slug: 'washing-machine', sortOrder: 5 },
  { name: 'Refrigerator', slug: 'refrigerator', sortOrder: 6 },
  { name: 'Microwave & Oven', slug: 'microwave', sortOrder: 7 },
  { name: 'Plumbing Services', slug: 'plumbing', sortOrder: 8 },
  { name: 'Mechanical & Auto', slug: 'mechanical', sortOrder: 9 },
  { name: 'Electrical & Wiring', slug: 'electrical', sortOrder: 10 },
  { name: 'Printer & Scanner', slug: 'printer', sortOrder: 11 },
  { name: 'Other Electronics', slug: 'other', sortOrder: 12 },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(DeviceCategoryEntity)
    private readonly categoryRepo: Repository<DeviceCategoryEntity>,
  ) {}

  public async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Syncing default service categories...');
      for (const cat of DEFAULT_CATEGORIES) {
        const existing = await this.categoryRepo.findOne({ where: { slug: cat.slug } });
        if (!existing) {
          await this.categoryRepo.save(this.categoryRepo.create({ ...cat, isActive: true }));
        }
      }
      this.logger.log(`Service categories synced successfully.`);
    } catch (err) {
      this.logger.warn(`Could not auto-seed categories: ${err}`);
    }
  }

  public async findAll(): Promise<DeviceCategoryEntity[]> {
    for (const cat of DEFAULT_CATEGORIES) {
      try {
        const existing = await this.categoryRepo.findOne({ where: { slug: cat.slug } });
        if (!existing) {
          await this.categoryRepo.save(this.categoryRepo.create({ ...cat, isActive: true }));
        }
      } catch {}
    }

    return this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  public async findById(id: string): Promise<DeviceCategoryEntity> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  public async findBySlug(slug: string): Promise<DeviceCategoryEntity> {
    const cat = await this.categoryRepo.findOne({ where: { slug } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  public async create(dto: CreateCategoryDto): Promise<DeviceCategoryEntity> {
    const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Category slug already exists');
    const cat = this.categoryRepo.create({ ...dto, isActive: true });
    return this.categoryRepo.save(cat);
  }

  public async update(id: string, dto: Partial<CreateCategoryDto>): Promise<DeviceCategoryEntity> {
    const cat = await this.findById(id);
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  public async deactivate(id: string): Promise<{ message: string }> {
    await this.findById(id);
    await this.categoryRepo.update(id, { isActive: false });
    return { message: 'Category deactivated' };
  }
}

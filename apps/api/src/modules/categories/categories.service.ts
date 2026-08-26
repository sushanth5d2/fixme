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
      this.logger.log('Syncing and deduplicating service categories...');
      // Deactivate redundant duplicate slugs
      await this.categoryRepo
        .createQueryBuilder()
        .update(DeviceCategoryEntity)
        .set({ isActive: false })
        .where("slug IN ('mobile-phone', 'air-conditioner', 'desktop-pc')")
        .execute()
        .catch(() => {});

      // Ensure each standard category exists and is active
      for (const cat of DEFAULT_CATEGORIES) {
        const existing = await this.categoryRepo.findOne({ where: { slug: cat.slug } });
        if (!existing) {
          await this.categoryRepo.save(this.categoryRepo.create({ ...cat, isActive: true }));
        } else if (!existing.isActive || existing.name !== cat.name) {
          existing.isActive = true;
          existing.name = cat.name;
          existing.sortOrder = cat.sortOrder;
          await this.categoryRepo.save(existing);
        }
      }
      this.logger.log(`Service categories synced without duplicates.`);
    } catch (err) {
      this.logger.warn(`Could not auto-seed categories: ${err}`);
    }
  }

  public async findAll(): Promise<DeviceCategoryEntity[]> {
    const list = await this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Deduplicate by name/slug if any duplicates exist in database
    const seen = new Set<string>();
    const unique: DeviceCategoryEntity[] = [];

    for (const item of list) {
      const key = item.slug.toLowerCase().replace(/[^a-z]/g, '');
      const normalizedName = item.name.toLowerCase().replace(/[^a-z]/g, '');
      if (!seen.has(key) && !seen.has(normalizedName)) {
        seen.add(key);
        seen.add(normalizedName);
        unique.push(item);
      }
    }

    return unique;
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

  public async create(dto: Partial<CreateCategoryDto> & { name: string }): Promise<DeviceCategoryEntity> {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.name = dto.name;
        return this.categoryRepo.save(existing);
      }
      throw new ConflictException('Category with this name/slug already exists');
    }
    const cat = this.categoryRepo.create({ ...dto, slug, isActive: true });
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

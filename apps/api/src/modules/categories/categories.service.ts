import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceCategoryEntity } from './device-category.entity';

export class CreateCategoryDto {
  name!: string;
  slug!: string;
  sortOrder?: number;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(DeviceCategoryEntity)
    private readonly categoryRepo: Repository<DeviceCategoryEntity>,
  ) {}

  public async findAll(): Promise<DeviceCategoryEntity[]> {
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

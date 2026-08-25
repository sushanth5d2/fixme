import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  FixerVerificationStatus,
  DocumentStatus,
  UserRole,
  UserStatus,
} from '@fixme/shared-types';
import { FixerEntity } from './fixer.entity';
import { FixerMemberEntity } from './fixer-member.entity';
import { FixerDocumentEntity } from './fixer-document.entity';
import { FixerServiceEntity } from './fixer-service.entity';
import { FixerServiceAreaEntity } from './fixer-service-area.entity';
import { DeviceCategoryEntity } from '../categories/device-category.entity';
import { DeviceBrandEntity } from '../brands/device-brand.entity';
import { UserEntity } from '../users/user.entity';
import {
  RegisterFixerDto,
  UpdateFixerProfileDto,
  AddFixerServiceDto,
  AddFixerServiceAreaDto,
  VerifyFixerDto,
} from './dto/fixer.dto';

// Allowed status transitions for admin verification workflow
const ALLOWED_VERIFICATION_TRANSITIONS: Partial<
  Record<FixerVerificationStatus, FixerVerificationStatus[]>
> = {
  [FixerVerificationStatus.REGISTERED]: [
    FixerVerificationStatus.DOCUMENT_SUBMITTED,
    FixerVerificationStatus.UNDER_REVIEW,
    FixerVerificationStatus.VERIFIED,
  ],
  [FixerVerificationStatus.DOCUMENT_SUBMITTED]: [
    FixerVerificationStatus.UNDER_REVIEW,
    FixerVerificationStatus.VERIFIED,
    FixerVerificationStatus.REJECTED,
  ],
  [FixerVerificationStatus.UNDER_REVIEW]: [
    FixerVerificationStatus.VERIFIED,
    FixerVerificationStatus.REJECTED,
  ],
  [FixerVerificationStatus.REJECTED]: [
    FixerVerificationStatus.DOCUMENT_SUBMITTED,
  ],
  [FixerVerificationStatus.VERIFIED]: [
    FixerVerificationStatus.BLOCKED,
  ],
};

@Injectable()
export class FixersService implements OnModuleInit {
  private readonly logger = new Logger(FixersService.name);

  constructor(
    @InjectRepository(FixerEntity)
    private readonly fixerRepo: Repository<FixerEntity>,

    @InjectRepository(FixerMemberEntity)
    private readonly memberRepo: Repository<FixerMemberEntity>,

    @InjectRepository(FixerDocumentEntity)
    private readonly documentRepo: Repository<FixerDocumentEntity>,

    @InjectRepository(FixerServiceEntity)
    private readonly serviceRepo: Repository<FixerServiceEntity>,

    @InjectRepository(FixerServiceAreaEntity)
    private readonly serviceAreaRepo: Repository<FixerServiceAreaEntity>,

    @InjectRepository(DeviceCategoryEntity)
    private readonly categoryRepo: Repository<DeviceCategoryEntity>,

    @InjectRepository(DeviceBrandEntity)
    private readonly brandRepo: Repository<DeviceBrandEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly dataSource: DataSource,
  ) {}

  public async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS fixer_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          fixer_id UUID NOT NULL REFERENCES fixers(id) ON DELETE CASCADE,
          user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          full_name VARCHAR(200) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phone VARCHAR(15) NOT NULL,
          profile_photo_key TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_fixer_members_fixer_id ON fixer_members(fixer_id);
        CREATE INDEX IF NOT EXISTS idx_fixer_members_user_id ON fixer_members(user_id);

        DO $$ BEGIN
          ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_member_id UUID REFERENCES fixer_members(id) ON DELETE SET NULL;
          ALTER TABLE jobs ADD COLUMN IF NOT EXISTS revised_total DECIMAL(10,2);
          ALTER TABLE jobs ADD COLUMN IF NOT EXISTS revision_notes TEXT;
          ALTER TABLE jobs ADD COLUMN IF NOT EXISTS revision_status VARCHAR(50) DEFAULT 'NONE';
        EXCEPTION
          WHEN others THEN NULL;
        END $$;
      `);
      this.logger.log('fixer_members table and job assignment columns verified');
    } catch (e: any) {
      this.logger.warn(`Could not verify fixer_members schema: ${e?.message}`);
    }
  }

  // ── Registration ───────────────────────────────────────────

  public async register(userId: string, dto: RegisterFixerDto): Promise<FixerEntity> {
    const existing = await this.fixerRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Fixer profile already exists for this account');
    }

    if (dto.gstin) {
      const gstinTaken = await this.fixerRepo.findOne({
        where: { gstin: dto.gstin.toUpperCase() },
      });
      if (gstinTaken) {
        throw new ConflictException('This GSTIN is already registered');
      }
    }

    const fixer = this.fixerRepo.create({
      userId,
      ownerName: dto.ownerName,
      companyName: dto.companyName,
      gstin: dto.gstin ? dto.gstin.toUpperCase() : null,
      description: dto.description ?? null,
      experienceYears: dto.experienceYears,
      emergencyService: dto.emergencyService,
      workingHoursStart: dto.workingHoursStart ?? null,
      workingHoursEnd: dto.workingHoursEnd ?? null,
      workingDays: dto.workingDays ?? [],
      addressLine: dto.addressLine,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      verificationStatus: FixerVerificationStatus.REGISTERED,
    });

    await this.fixerRepo.save(fixer);
    this.logger.log(`Fixer registered: ${fixer.id} for user: ${userId}`);
    return fixer;
  }

  // ── Profile ────────────────────────────────────────────────

  public async getMyProfile(userId: string): Promise<FixerEntity> {
    const fixer = await this.fixerRepo.findOne({
      where: { userId },
      relations: ['services', 'services.category', 'services.brand', 'serviceAreas'],
    });
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    return fixer;
  }

  public async getPublicProfile(fixerId: string): Promise<FixerEntity> {
    const fixer = await this.fixerRepo.findOne({
      where: { id: fixerId, verificationStatus: FixerVerificationStatus.VERIFIED },
      relations: ['services', 'services.category', 'services.brand', 'serviceAreas'],
    });
    if (!fixer) throw new NotFoundException('Fixer not found');
    return fixer;
  }

  public async updateProfile(
    userId: string,
    dto: UpdateFixerProfileDto,
  ): Promise<FixerEntity> {
    const fixer = await this.findFixerByUserOrFail(userId);

    // GSTIN uniqueness check on update
    if (dto.gstin && dto.gstin.toUpperCase() !== fixer.gstin) {
      const gstinTaken = await this.fixerRepo.findOne({
        where: { gstin: dto.gstin.toUpperCase() },
      });
      if (gstinTaken) throw new ConflictException('This GSTIN is already registered');
    }

    Object.assign(fixer, {
      ...(dto.ownerName !== undefined && { ownerName: dto.ownerName }),
      ...(dto.companyName !== undefined && { companyName: dto.companyName }),
      ...(dto.gstin !== undefined && { gstin: dto.gstin?.toUpperCase() ?? null }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.experienceYears !== undefined && { experienceYears: dto.experienceYears }),
      ...(dto.emergencyService !== undefined && { emergencyService: dto.emergencyService }),
      ...(dto.workingHoursStart !== undefined && { workingHoursStart: dto.workingHoursStart }),
      ...(dto.workingHoursEnd !== undefined && { workingHoursEnd: dto.workingHoursEnd }),
      ...(dto.workingDays !== undefined && { workingDays: dto.workingDays }),
      ...(dto.addressLine !== undefined && { addressLine: dto.addressLine }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.pincode !== undefined && { pincode: dto.pincode }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
    });

    return this.fixerRepo.save(fixer);
  }

  // ── Services (categories + brands offered) ─────────────────

  public async addService(userId: string, dto: AddFixerServiceDto): Promise<FixerServiceEntity> {
    const fixer = await this.findFixerByUserOrFail(userId);

    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId, isActive: true } });
    if (!category) throw new NotFoundException('Device category not found');

    if (dto.brandId) {
      const brand = await this.brandRepo.findOne({ where: { id: dto.brandId, isActive: true } });
      if (!brand) throw new NotFoundException('Device brand not found');
    }

    const existing = await this.serviceRepo.findOne({
      where: {
        fixerId: fixer.id,
        categoryId: dto.categoryId,
        ...(dto.brandId ? { brandId: dto.brandId } : { brandId: IsNull() }),
      },
    });
    if (existing) throw new ConflictException('This service is already added');

    const service = this.serviceRepo.create({
      fixerId: fixer.id,
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
    });
    return this.serviceRepo.save(service);
  }

  public async removeService(userId: string, serviceId: string): Promise<{ message: string }> {
    const fixer = await this.findFixerByUserOrFail(userId);
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, fixerId: fixer.id },
    });
    if (!service) throw new NotFoundException('Service not found');
    await this.serviceRepo.delete(serviceId);
    return { message: 'Service removed' };
  }

  // ── Service Areas ──────────────────────────────────────────

  public async addServiceArea(
    userId: string,
    dto: AddFixerServiceAreaDto,
  ): Promise<FixerServiceAreaEntity> {
    const fixer = await this.findFixerByUserOrFail(userId);

    const area = this.serviceAreaRepo.create({
      fixerId: fixer.id,
      type: dto.type,
      pincode: dto.pincode ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      radiusKm: dto.radiusKm ?? null,
    });
    return this.serviceAreaRepo.save(area);
  }

  public async removeServiceArea(userId: string, areaId: string): Promise<{ message: string }> {
    const fixer = await this.findFixerByUserOrFail(userId);
    const area = await this.serviceAreaRepo.findOne({
      where: { id: areaId, fixerId: fixer.id },
    });
    if (!area) throw new NotFoundException('Service area not found');
    await this.serviceAreaRepo.delete(areaId);
    return { message: 'Service area removed' };
  }

  // ── Document Submission ────────────────────────────────────

  public async submitDocument(
    userId: string,
    storageKey: string,
    documentType: string,
  ): Promise<FixerDocumentEntity> {
    const fixer = await this.findFixerByUserOrFail(userId);

    const doc = this.documentRepo.create({
      fixerId: fixer.id,
      type: documentType as import('@fixme/shared-types').DocumentType,
      storageKey,
      status: DocumentStatus.PENDING,
    });
    const saved = await this.documentRepo.save(doc);

    // Auto-advance status to DOCUMENT_SUBMITTED if still REGISTERED
    if (fixer.verificationStatus === FixerVerificationStatus.REGISTERED) {
      await this.fixerRepo.update(fixer.id, {
        verificationStatus: FixerVerificationStatus.DOCUMENT_SUBMITTED,
      });
    }

    this.logger.log(`Document submitted: ${saved.id} by fixer: ${fixer.id}`);
    return saved;
  }

  // ── Admin: Verification Workflow ───────────────────────────

  public async verifyFixer(
    fixerId: string,
    adminUserId: string,
    dto: VerifyFixerDto,
  ): Promise<FixerEntity> {
    const fixer = await this.fixerRepo.findOne({ where: { id: fixerId } });
    if (!fixer) throw new NotFoundException('Fixer not found');

    const newStatus =
      dto.action === 'VERIFIED'
        ? FixerVerificationStatus.VERIFIED
        : FixerVerificationStatus.REJECTED;

    const allowed = ALLOWED_VERIFICATION_TRANSITIONS[fixer.verificationStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${fixer.verificationStatus} to ${newStatus}`,
      );
    }

    if (dto.action === 'REJECTED' && !dto.rejectionReason) {
      throw new BadRequestException('rejectionReason is required when rejecting a fixer');
    }

    fixer.verificationStatus = newStatus;
    fixer.rejectionReason = dto.rejectionReason ?? null;
    await this.fixerRepo.save(fixer);

    this.logger.log(
      `Fixer ${fixerId} ${newStatus} by admin ${adminUserId}`,
    );
    return fixer;
  }

  public async listForAdmin(
    status?: FixerVerificationStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: FixerEntity[]; total: number; page: number; limit: number }> {
    const query = this.fixerRepo.createQueryBuilder('fixer');
    if (status) query.where('fixer.verificationStatus = :status', { status });
    query.orderBy('fixer.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Search (public facing) ─────────────────────────────────

  public async search(params: {
    query?: string;
    name?: string;
    location?: string;
    categoryId?: string;
    brandId?: string;
    city?: string;
    pincode?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: FixerEntity[]; total: number }> {
    const { query: searchParam, name, location, categoryId, brandId, city, pincode, page = 1, limit = 50 } = params;

    const qb = this.fixerRepo
      .createQueryBuilder('fixer')
      .leftJoinAndSelect('fixer.services', 'svc')
      .leftJoinAndSelect('svc.category', 'cat')
      .leftJoinAndSelect('fixer.serviceAreas', 'area')
      .where('fixer.verificationStatus IN (:...statuses)', {
        statuses: [
          FixerVerificationStatus.VERIFIED,
          FixerVerificationStatus.REGISTERED,
          FixerVerificationStatus.DOCUMENT_SUBMITTED,
        ],
      });

    if (searchParam && searchParam.trim()) {
      const term = `%${searchParam.trim()}%`;
      qb.andWhere(
        '(fixer.companyName ILIKE :term OR fixer.ownerName ILIKE :term OR fixer.city ILIKE :term OR fixer.pincode ILIKE :term OR fixer.addressLine ILIKE :term OR area.city ILIKE :term OR area.pincode ILIKE :term)',
        { term },
      );
    }

    if (name && name.trim()) {
      qb.andWhere('(fixer.companyName ILIKE :name OR fixer.ownerName ILIKE :name)', {
        name: `%${name.trim()}%`,
      });
    }

    if (location && location.trim()) {
      qb.andWhere('(fixer.addressLine ILIKE :loc OR fixer.city ILIKE :loc OR area.city ILIKE :loc)', {
        loc: `%${location.trim()}%`,
      });
    }

    if (categoryId) {
      qb.andWhere('svc.categoryId = :categoryId', { categoryId });
    }
    if (brandId) {
      qb.andWhere('(svc.brandId = :brandId OR svc.brandId IS NULL)', { brandId });
    }
    if (city && city.trim()) {
      qb.andWhere(
        '(fixer.city ILIKE :city OR area.city ILIKE :city)',
        { city: `%${city.trim()}%` },
      );
    }
    if (pincode && pincode.trim()) {
      qb.andWhere(
        '(fixer.pincode = :pincode OR area.pincode = :pincode)',
        { pincode: pincode.trim() },
      );
    }

    qb
      .orderBy('fixer.averageRating', 'DESC')
      .addOrderBy('fixer.completedJobs', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ── Internal Helpers ───────────────────────────────────────

  public async findFixerByUserOrFail(userId: string): Promise<FixerEntity> {
    const fixer = await this.fixerRepo.findOne({ where: { userId } });
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    return fixer;
  }

  public async findFixerByIdOrFail(fixerId: string): Promise<FixerEntity> {
    const fixer = await this.fixerRepo.findOne({ where: { id: fixerId } });
    if (!fixer) throw new NotFoundException('Fixer not found');
    return fixer;
  }

  // ── Fixer Team Members / Staff ──────────────────────────────

  public async createMember(
    fixerUserId: string,
    dto: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      profilePhotoKey?: string;
    },
  ): Promise<FixerMemberEntity> {
    const fixer = await this.findFixerByUserOrFail(fixerUserId);

    const emailNorm = dto.email.trim().toLowerCase();
    const existingUser = await this.userRepo.findOne({ where: { email: emailNorm } });
    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, {
        email: emailNorm,
        mobile: dto.phone.replace(/\D/g, '').slice(-10),
        passwordHash,
        role: UserRole.FIXER_MEMBER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isMobileVerified: true,
      });
      const savedUser = await manager.save(user);

      const member = manager.create(FixerMemberEntity, {
        fixerId: fixer.id,
        userId: savedUser.id,
        fullName: dto.fullName.trim(),
        email: emailNorm,
        phone: dto.phone.trim(),
        profilePhotoKey: dto.profilePhotoKey || null,
        isActive: true,
      });

      const savedMember = await manager.save(member);
      this.logger.log(`Fixer member added: ${savedMember.fullName} for business: ${fixer.companyName}`);
      return savedMember;
    });
  }

  public async getMembers(fixerUserId: string): Promise<FixerMemberEntity[]> {
    const fixer = await this.findFixerByUserOrFail(fixerUserId);
    return this.memberRepo.find({
      where: { fixerId: fixer.id },
      order: { createdAt: 'DESC' },
    });
  }

  public async deleteMember(fixerUserId: string, memberId: string): Promise<{ message: string }> {
    const fixer = await this.findFixerByUserOrFail(fixerUserId);
    const member = await this.memberRepo.findOne({
      where: { id: memberId, fixerId: fixer.id },
    });
    if (!member) throw new NotFoundException('Team member not found');

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(FixerMemberEntity, member.id);
      await manager.delete(UserEntity, member.userId);
    });

    this.logger.log(`Fixer member deleted: ${member.id}`);
    return { message: 'Member removed successfully' };
  }

  public async resetMemberPassword(
    fixerUserId: string,
    memberId: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const fixer = await this.findFixerByUserOrFail(fixerUserId);
    const member = await this.memberRepo.findOne({
      where: { id: memberId, fixerId: fixer.id },
    });
    if (!member) throw new NotFoundException('Team member not found');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(member.userId, { passwordHash });

    this.logger.log(`Password reset for fixer member: ${member.id}`);
    return { message: 'Password reset successfully' };
  }

  public async getMyMemberProfile(memberUserId: string): Promise<any> {
    const member = await this.memberRepo.findOne({
      where: { userId: memberUserId },
      relations: ['fixer'],
    });
    if (!member) throw new NotFoundException('Member profile not found');
    return member;
  }
}

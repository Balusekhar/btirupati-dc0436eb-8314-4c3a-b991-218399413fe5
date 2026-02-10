import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@org/data';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Organization, User } from '../entities';

export interface RequestUser {
  id: string;
  role: string;
  organizationId: string | null;
}

@Injectable()
export class OrganisationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private audit: AuditService,
  ) {}

  async create(
    name: string,
    parentId: string | undefined,
    user: RequestUser,
  ): Promise<Organization> {
    if (user.role !== Role.Owner) {
      throw new ForbiddenException('Only Owner can create organisations');
    }

    let parent: Organization | null = null;
    if (user.organizationId == null) {
      if (parentId != null) {
        throw new BadRequestException('Cannot set parentId when creating your first (root) organisation');
      }
      const root = this.orgRepo.create({ name, parentId: null });
      const saved = await this.orgRepo.save(root);
      await this.userRepo.update(user.id, { organizationId: saved.id });
      await this.audit.log(user.id, saved.id, 'organization:create', 'organization', saved.id, { name: saved.name });
      return saved;
    }

    const myOrg = await this.orgRepo.findOne({ where: { id: user.organizationId } });
    if (!myOrg) throw new NotFoundException('Your organisation not found');
    if (myOrg.parentId != null) {
      throw new ForbiddenException('Only Owner of a root (Level 1) organisation can create sub-organisations');
    }

    if (parentId != null && parentId !== user.organizationId) {
      throw new BadRequestException('parentId must be your root organisation id');
    }
    const child = this.orgRepo.create({
      name,
      parentId: user.organizationId,
    });
    const saved = await this.orgRepo.save(child);
    await this.audit.log(user.id, user.organizationId, 'organization:create', 'organization', saved.id, { name: saved.name, parentId: saved.parentId });
    return saved;
  }

  async findAll(user: RequestUser): Promise<Organization[]> {
    if (!user.organizationId) return [];
    const org = await this.orgRepo.findOne({
      where: { id: user.organizationId },
      relations: ['children'],
    });
    if (!org) return [];
    if (user.role === Role.Owner && org.parentId == null) {
      return [org, ...(org.children ?? [])];
    }
    return [org];
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    if (user.role !== Role.Owner) {
      throw new ForbiddenException('Only Owner can delete organisations');
    }
    if (!user.organizationId) throw new ForbiddenException('No organisation assigned');
    const org = await this.orgRepo.findOne({
      where: { id },
      relations: ['users', 'parent'],
    });
    if (!org) throw new NotFoundException('Organisation not found');
    const myOrg = await this.orgRepo.findOne({ where: { id: user.organizationId } });
    if (!myOrg) throw new ForbiddenException('Your organisation not found');
    const isRoot = myOrg.parentId == null;
    const isMyRoot = org.id === user.organizationId;
    const isMyChild = org.parentId === user.organizationId;
    if (!isMyRoot && !isMyChild) {
      throw new ForbiddenException('You can only delete your root organisation or its direct children');
    }
    if (org.users?.length) {
      throw new BadRequestException('Cannot delete organisation that has users. Reassign or remove users first.');
    }
    if (isMyRoot) {
      await this.userRepo.update(user.id, { organizationId: null });
    }
    await this.orgRepo.remove(org);
    await this.audit.log(user.id, user.organizationId, 'organization:delete', 'organization', id, { name: org.name });
  }
}

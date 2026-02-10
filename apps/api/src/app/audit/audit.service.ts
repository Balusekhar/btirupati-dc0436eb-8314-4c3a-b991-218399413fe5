import { Injectable } from '@nestjs/common';
import { getAccessibleOrgIds } from '@org/auth';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog, Organization } from '../entities';

export interface RequestUser {
  id: string;
  organizationId: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
  ) {}

  private async getAccessibleOrgIds(userOrgId: string): Promise<string[]> {
    const children = await this.orgRepo.find({
      where: { parentId: userOrgId },
      select: { id: true },
    });
    return getAccessibleOrgIds(userOrgId, children.map((o) => o.id));
  }

  async findAll(user: RequestUser): Promise<AuditLog[]> {
    const orgIds = await this.getAccessibleOrgIds(user.organizationId);
    return this.auditRepo.find({
      where: { organizationId: In(orgIds) },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: 500,
    });
  }
}

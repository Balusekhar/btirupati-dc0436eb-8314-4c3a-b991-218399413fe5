import { Injectable } from '@nestjs/common';
import { getAccessibleOrgIds, RequestUser } from '@org/auth';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog, Organization } from '../entities';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
  ) {}

  /**
   * Persist an audit entry. Optionally console.log in development.
   */
  async log(
    userId: string | null,
    organizationId: string | null,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>,
  ): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      userId,
      organizationId,
      action,
      resource,
      resourceId: resourceId ?? '',
      details: details ?? null,
    });
    const saved = await this.auditRepo.save(entry);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[audit]', { action, resource, resourceId, userId });
    }
    return saved;
  }

  private async getAccessibleOrgIds(userOrgId: string): Promise<string[]> {
    const children = await this.orgRepo.find({
      where: { parentId: userOrgId },
      select: { id: true },
    });
    return getAccessibleOrgIds(userOrgId, children.map((o) => o.id));
  }

  async findAll(user: RequestUser): Promise<AuditLog[]> {
    if (!user.organizationId) return [];
    const orgIds = await this.getAccessibleOrgIds(user.organizationId);
    return this.auditRepo.find({
      where: { organizationId: In(orgIds) },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: 100,
    });
  }
}

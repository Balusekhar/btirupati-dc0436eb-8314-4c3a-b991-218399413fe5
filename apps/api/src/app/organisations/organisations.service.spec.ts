import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrganisationsService } from './organisations.service';
import { Role } from '@org/data';
import type { RequestUser } from '@org/auth';

describe('OrganisationsService', () => {
  let service: OrganisationsService;
  let mockOrgRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockUserRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockAuditService: Record<string, ReturnType<typeof vi.fn>>;

  const ownerWithOrg: RequestUser = {
    id: 'user-1',
    email: 'owner@example.com',
    role: Role.Owner,
    organizationId: 'org-root',
  };

  const ownerWithoutOrg: RequestUser = {
    id: 'user-1',
    email: 'owner@example.com',
    role: Role.Owner,
    organizationId: null,
  };

  const adminUser: RequestUser = {
    id: 'user-2',
    email: 'admin@example.com',
    role: Role.Admin,
    organizationId: 'org-child',
  };

  beforeEach(() => {
    mockOrgRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data: Record<string, unknown>) => ({
        id: 'org-new',
        ...data,
      })),
      save: vi.fn((org: Record<string, unknown>) =>
        Promise.resolve({ ...org, id: org['id'] || 'org-new' }),
      ),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    mockUserRepo = {
      update: vi.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue({}),
    };

    service = new (OrganisationsService as any)(
      mockOrgRepo,
      mockUserRepo,
      mockAuditService,
    );
  });

  // ── create ────────────────────────────────────────────────

  describe('create', () => {
    it('should create a root organization for owner without existing org', async () => {
      const result = await service.create('New Root Org', undefined, ownerWithoutOrg);

      expect(result).toEqual(
        expect.objectContaining({ name: 'New Root Org', parentId: null }),
      );
      expect(mockOrgRepo.create).toHaveBeenCalledWith({
        name: 'New Root Org',
        parentId: null,
      });
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        organizationId: expect.any(String),
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should create a child org for owner with root org', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-root',
        parentId: null,
      });

      const result = await service.create(
        'Child Org',
        'org-root',
        ownerWithOrg,
      );

      expect(result).toEqual(
        expect.objectContaining({
          name: 'Child Org',
          parentId: 'org-root',
        }),
      );
    });

    it('should throw ForbiddenException when non-owner tries to create', async () => {
      await expect(
        service.create('Org', undefined, adminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when parentId is set for first org', async () => {
      await expect(
        service.create('Org', 'some-parent', ownerWithoutOrg),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when owner belongs to a child org', async () => {
      const ownerInChild: RequestUser = {
        ...ownerWithOrg,
        organizationId: 'org-child',
      };
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-child',
        parentId: 'org-root',
      }); // child org

      await expect(
        service.create('Another Org', undefined, ownerInChild),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findAll ───────────────────────────────────────────────

  describe('findAll', () => {
    it('should return root org + children for owner of root org', async () => {
      const rootOrg = {
        id: 'org-root',
        name: 'Root',
        parentId: null,
        children: [{ id: 'org-child', name: 'Child', parentId: 'org-root' }],
      };
      mockOrgRepo.findOne.mockResolvedValue(rootOrg);

      const result = await service.findAll(ownerWithOrg);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('org-root');
      expect(result[1].id).toBe('org-child');
    });

    it('should return only own org for non-owner user', async () => {
      const childOrg = {
        id: 'org-child',
        name: 'Child',
        parentId: 'org-root',
        children: [],
      };
      mockOrgRepo.findOne.mockResolvedValue(childOrg);

      const result = await service.findAll(adminUser);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-child');
    });

    it('should return empty array when user has no organization', async () => {
      const result = await service.findAll(ownerWithoutOrg);

      expect(result).toEqual([]);
    });
  });

  // ── remove ────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove a child organization with no users', async () => {
      mockOrgRepo.findOne
        .mockResolvedValueOnce({
          id: 'org-child',
          name: 'Child',
          parentId: 'org-root',
          users: [],
        })
        .mockResolvedValueOnce({ id: 'org-root', parentId: null }); // user's org

      await service.remove('org-child', ownerWithOrg);

      expect(mockOrgRepo.remove).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user-1',
        'org-root',
        'organization:delete',
        'organization',
        'org-child',
        expect.objectContaining({ name: 'Child' }),
      );
    });

    it('should throw ForbiddenException for non-owner', async () => {
      await expect(
        service.remove('org-child', adminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when org does not exist', async () => {
      mockOrgRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.remove('nonexistent', ownerWithOrg),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when org has users', async () => {
      mockOrgRepo.findOne
        .mockResolvedValueOnce({
          id: 'org-child',
          parentId: 'org-root',
          users: [{ id: 'user-2' }],
        })
        .mockResolvedValueOnce({ id: 'org-root', parentId: null });

      await expect(
        service.remove('org-child', ownerWithOrg),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear user organizationId when removing own root org', async () => {
      mockOrgRepo.findOne
        .mockResolvedValueOnce({
          id: 'org-root',
          name: 'Root',
          parentId: null,
          users: [],
        })
        .mockResolvedValueOnce({ id: 'org-root', parentId: null });

      await service.remove('org-root', ownerWithOrg);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        organizationId: null,
      });
    });
  });
});

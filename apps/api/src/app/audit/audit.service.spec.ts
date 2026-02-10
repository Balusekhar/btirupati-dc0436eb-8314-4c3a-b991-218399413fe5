import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service';
import { Role } from '@org/data';
import type { RequestUser } from '@org/auth';

describe('AuditService', () => {
  let service: AuditService;
  let mockAuditRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockOrgRepo: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockAuditRepo = {
      create: vi.fn((data: Record<string, unknown>) => ({
        id: 'audit-1',
        ...data,
      })),
      save: vi.fn((entry: Record<string, unknown>) =>
        Promise.resolve({ ...entry, id: entry['id'] || 'audit-1' }),
      ),
      find: vi.fn(),
    };

    mockOrgRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    service = new (AuditService as any)(mockAuditRepo, mockOrgRepo);
  });

  // ── log ───────────────────────────────────────────────────

  describe('log', () => {
    it('should create and persist an audit log entry', async () => {
      const result = await service.log(
        'user-1',
        'org-1',
        'task:create',
        'task',
        'task-123',
        { title: 'New Task' },
      );

      expect(mockAuditRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'task:create',
        resource: 'task',
        resourceId: 'task-123',
        details: { title: 'New Task' },
      });
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ action: 'task:create' }),
      );
    });

    it('should handle null userId and organizationId', async () => {
      await service.log(null, null, 'system:event', 'system');

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          organizationId: null,
          resourceId: '',
          details: null,
        }),
      );
    });

    it('should default resourceId to empty string when not provided', async () => {
      await service.log('user-1', 'org-1', 'user:login', 'user');

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: '' }),
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────

  describe('findAll', () => {
    const ownerUser: RequestUser = {
      id: 'user-1',
      email: 'owner@example.com',
      role: Role.Owner,
      organizationId: 'org-1',
    };

    const noOrgUser: RequestUser = {
      id: 'user-2',
      email: 'noorg@example.com',
      role: Role.Viewer,
      organizationId: null,
    };

    it('should return audit logs for accessible organizations', async () => {
      const logs = [
        {
          id: 'audit-1',
          action: 'task:create',
          organizationId: 'org-1',
        },
      ];
      mockOrgRepo.find.mockResolvedValue([]); // no child orgs
      mockAuditRepo.find.mockResolvedValue(logs);

      const result = await service.findAll(ownerUser);

      expect(result).toEqual(logs);
      expect(mockAuditRepo.find).toHaveBeenCalled();
    });

    it('should return empty array when user has no organization', async () => {
      const result = await service.findAll(noOrgUser);

      expect(result).toEqual([]);
      expect(mockAuditRepo.find).not.toHaveBeenCalled();
    });

    it('should include child org logs', async () => {
      mockOrgRepo.find.mockResolvedValue([{ id: 'org-child' }]);
      mockAuditRepo.find.mockResolvedValue([]);

      await service.findAll(ownerUser);

      expect(mockAuditRepo.find).toHaveBeenCalled();
    });
  });
});

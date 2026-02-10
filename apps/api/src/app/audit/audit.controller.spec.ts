import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditController } from './audit.controller';

describe('AuditController', () => {
  let controller: AuditController;
  let mockAuditService: Record<string, ReturnType<typeof vi.fn>>;

  const mockReq = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      role: 'owner',
      organizationId: 'org-1',
    },
  };

  beforeEach(() => {
    mockAuditService = {
      findAll: vi.fn(),
    };

    controller = new (AuditController as any)(mockAuditService);
  });

  describe('findAll', () => {
    it('should delegate to AuditService.findAll with req.user', async () => {
      const logs = [
        { id: 'log-1', action: 'task:create' },
        { id: 'log-2', action: 'user:login' },
      ];
      mockAuditService.findAll.mockResolvedValue(logs);

      const result = await controller.findAll(mockReq as any);

      expect(result).toEqual(logs);
      expect(mockAuditService.findAll).toHaveBeenCalledWith(mockReq.user);
    });

    it('should return empty array when service returns empty', async () => {
      mockAuditService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockReq as any);

      expect(result).toEqual([]);
    });
  });
});

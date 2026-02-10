import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganisationsController } from './organisations.controller';

describe('OrganisationsController', () => {
  let controller: OrganisationsController;
  let mockService: Record<string, ReturnType<typeof vi.fn>>;

  const mockReq = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      role: 'owner',
      organizationId: 'org-1',
    },
  };

  beforeEach(() => {
    mockService = {
      create: vi.fn(),
      findAll: vi.fn(),
      remove: vi.fn(),
    };

    controller = new (OrganisationsController as any)(mockService);
  });

  describe('create', () => {
    it('should delegate to service with name, parentId, and user', async () => {
      const dto = { name: 'New Org', parentId: 'org-1' };
      const created = { id: 'org-new', name: 'New Org', parentId: 'org-1' };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(dto, mockReq as any);

      expect(result).toEqual(created);
      expect(mockService.create).toHaveBeenCalledWith(
        'New Org',
        'org-1',
        mockReq.user,
      );
    });
  });

  describe('findAll', () => {
    it('should delegate to service with req.user', async () => {
      const orgs = [{ id: 'org-1', name: 'Org One' }];
      mockService.findAll.mockResolvedValue(orgs);

      const result = await controller.findAll(mockReq as any);

      expect(result).toEqual(orgs);
      expect(mockService.findAll).toHaveBeenCalledWith(mockReq.user);
    });
  });

  describe('remove', () => {
    it('should delegate to service with id and req.user', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('org-1', mockReq as any);

      expect(mockService.remove).toHaveBeenCalledWith('org-1', mockReq.user);
    });
  });
});

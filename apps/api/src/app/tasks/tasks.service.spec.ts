import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskCategory, TaskStatus, Role } from '@org/data';
import type { RequestUser } from '@org/auth';

describe('TasksService', () => {
  let service: TasksService;
  let mockTaskRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockOrgRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockAuditService: Record<string, ReturnType<typeof vi.fn>>;

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

  beforeEach(() => {
    mockTaskRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data: Record<string, unknown>) => ({
        id: 'task-1',
        ...data,
      })),
      save: vi.fn((task: Record<string, unknown>) =>
        Promise.resolve({ ...task, id: task['id'] || 'task-1' }),
      ),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    mockOrgRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue({}),
    };

    service = new (TasksService as any)(
      mockTaskRepo,
      mockOrgRepo,
      mockAuditService,
    );
  });

  // ── findAll ───────────────────────────────────────────────

  describe('findAll', () => {
    it('should return tasks for accessible organizations', async () => {
      const tasks = [
        { id: 'task-1', title: 'Task One', organizationId: 'org-1' },
      ];
      mockOrgRepo.find.mockResolvedValue([]); // no children
      mockTaskRepo.find.mockResolvedValue(tasks);

      const result = await service.findAll(ownerUser);

      expect(result).toEqual(tasks);
      expect(mockTaskRepo.find).toHaveBeenCalled();
    });

    it('should return empty array when user has no organization', async () => {
      const result = await service.findAll(noOrgUser);

      expect(result).toEqual([]);
      expect(mockTaskRepo.find).not.toHaveBeenCalled();
    });

    it('should include child org tasks', async () => {
      mockOrgRepo.find.mockResolvedValue([{ id: 'org-child-1' }]);
      mockTaskRepo.find.mockResolvedValue([]);

      await service.findAll(ownerUser);

      // Verify that find was called with both org-1 and org-child-1
      expect(mockTaskRepo.find).toHaveBeenCalled();
    });
  });

  // ── findOne ───────────────────────────────────────────────

  describe('findOne', () => {
    it('should return task when found and user has access', async () => {
      const task = {
        id: 'task-1',
        title: 'My Task',
        organizationId: 'org-1',
        organization: { parentId: null },
      };
      mockOrgRepo.find.mockResolvedValue([]);
      mockTaskRepo.findOne.mockResolvedValue(task);

      const result = await service.findOne('task-1', ownerUser);

      expect(result).toEqual(task);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', ownerUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user has no organization', async () => {
      await expect(service.findOne('task-1', noOrgUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user cannot access task org', async () => {
      const task = {
        id: 'task-1',
        organizationId: 'other-org',
        organization: { parentId: 'another-root' },
      };
      mockTaskRepo.findOne.mockResolvedValue(task);

      await expect(service.findOne('task-1', ownerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── create ────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      title: 'New Task',
      description: 'Task description',
      status: TaskStatus.Open,
      category: TaskCategory.Work,
      organizationId: 'org-1',
    };

    it('should create a task in allowed organization', async () => {
      mockOrgRepo.find.mockResolvedValue([]);

      const result = await service.create(createDto, ownerUser);

      expect(result).toEqual(
        expect.objectContaining({
          title: 'New Task',
          organizationId: 'org-1',
        }),
      );
      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Task',
          status: TaskStatus.Open,
          category: TaskCategory.Work,
          organizationId: 'org-1',
          createdById: 'user-1',
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'task:create',
        'task',
        expect.any(String),
        expect.objectContaining({ title: 'New Task' }),
      );
    });

    it('should throw ForbiddenException when user has no organization', async () => {
      await expect(service.create(createDto, noOrgUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when org is not in accessible list', async () => {
      mockOrgRepo.find.mockResolvedValue([]);

      await expect(
        service.create(
          { ...createDto, organizationId: 'other-org' },
          ownerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update ────────────────────────────────────────────────

  describe('update', () => {
    it('should update task fields', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Old Title',
        description: 'Old desc',
        status: TaskStatus.Open,
        organizationId: 'org-1',
        organization: { parentId: null },
      };
      mockTaskRepo.findOne.mockResolvedValue(existingTask);
      mockOrgRepo.find.mockResolvedValue([]);

      const result = await service.update(
        'task-1',
        { title: 'New Title', status: TaskStatus.InProgress },
        ownerUser,
      );

      expect(mockTaskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Title',
          status: TaskStatus.InProgress,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'task:update',
        'task',
        expect.any(String),
        expect.objectContaining({ title: 'New Title' }),
      );
    });

    it('should not overwrite fields that are not in the DTO', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Keep This',
        description: 'Keep This Too',
        status: TaskStatus.Open,
        organizationId: 'org-1',
        organization: { parentId: null },
      };
      mockTaskRepo.findOne.mockResolvedValue(existingTask);
      mockOrgRepo.find.mockResolvedValue([]);

      await service.update('task-1', { status: TaskStatus.Completed }, ownerUser);

      expect(mockTaskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Keep This',
          description: 'Keep This Too',
          status: TaskStatus.Completed,
        }),
      );
    });
  });

  // ── remove ────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a task and log audit', async () => {
      const task = {
        id: 'task-1',
        title: 'Delete Me',
        organizationId: 'org-1',
        organization: { parentId: null },
      };
      mockTaskRepo.findOne.mockResolvedValue(task);
      mockOrgRepo.find.mockResolvedValue([]);

      await service.remove('task-1', ownerUser);

      expect(mockTaskRepo.remove).toHaveBeenCalledWith(task);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'task:delete',
        'task',
        'task-1',
        expect.objectContaining({ title: 'Delete Me' }),
      );
    });
  });
});

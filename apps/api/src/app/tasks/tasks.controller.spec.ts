import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TasksController } from './tasks.controller';
import { TaskCategory, TaskStatus } from '@org/data';

describe('TasksController', () => {
  let controller: TasksController;
  let mockTasksService: Record<string, ReturnType<typeof vi.fn>>;

  const mockReq = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      role: 'owner',
      organizationId: 'org-1',
    },
  };

  beforeEach(() => {
    mockTasksService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    controller = new (TasksController as any)(mockTasksService);
  });

  describe('findAll', () => {
    it('should delegate to TasksService.findAll with req.user', async () => {
      const tasks = [{ id: 'task-1', title: 'Task One' }];
      mockTasksService.findAll.mockResolvedValue(tasks);

      const result = await controller.findAll(mockReq as any);

      expect(result).toEqual(tasks);
      expect(mockTasksService.findAll).toHaveBeenCalledWith(mockReq.user);
    });
  });

  describe('findOne', () => {
    it('should delegate to TasksService.findOne with id and req.user', async () => {
      const task = { id: 'task-1', title: 'Task One' };
      mockTasksService.findOne.mockResolvedValue(task);

      const result = await controller.findOne('task-1', mockReq as any);

      expect(result).toEqual(task);
      expect(mockTasksService.findOne).toHaveBeenCalledWith(
        'task-1',
        mockReq.user,
      );
    });
  });

  describe('create', () => {
    it('should delegate to TasksService.create with dto and req.user', async () => {
      const dto = {
        title: 'New Task',
        status: TaskStatus.Open,
        category: TaskCategory.Work,
        organizationId: 'org-1',
      };
      const created = { id: 'task-new', ...dto };
      mockTasksService.create.mockResolvedValue(created);

      const result = await controller.create(dto, mockReq as any);

      expect(result).toEqual(created);
      expect(mockTasksService.create).toHaveBeenCalledWith(dto, mockReq.user);
    });
  });

  describe('update', () => {
    it('should delegate to TasksService.update with id, dto, and req.user', async () => {
      const dto = { title: 'Updated Title' };
      const updated = {
        id: 'task-1',
        title: 'Updated Title',
        status: TaskStatus.Open,
      };
      mockTasksService.update.mockResolvedValue(updated);

      const result = await controller.update(
        'task-1',
        dto,
        mockReq as any,
      );

      expect(result).toEqual(updated);
      expect(mockTasksService.update).toHaveBeenCalledWith(
        'task-1',
        dto,
        mockReq.user,
      );
    });
  });

  describe('remove', () => {
    it('should delegate to TasksService.remove with id and req.user', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove('task-1', mockReq as any);

      expect(mockTasksService.remove).toHaveBeenCalledWith(
        'task-1',
        mockReq.user,
      );
    });
  });
});

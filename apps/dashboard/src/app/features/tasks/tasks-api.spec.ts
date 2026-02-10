import { TestBed } from '@angular/core/testing';
import { TasksApi } from './tasks-api';
import { ApiClientService } from '../../core/http/api-client.service';
import { TaskCategory, TaskStatus } from '@org/data';
import type { ApiTask } from './task.types';

describe('TasksApi', () => {
  let api: TasksApi;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const sampleTask: ApiTask = {
    id: 'task-1',
    title: 'Test Task',
    status: TaskStatus.Open,
    category: TaskCategory.Work,
    organizationId: 'org-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TasksApi,
        { provide: ApiClientService, useValue: mockClient },
      ],
    });

    api = TestBed.inject(TasksApi);
  });

  describe('list', () => {
    it('should call GET /tasks', async () => {
      mockClient.get.mockResolvedValue([sampleTask]);

      const result = await api.list();

      expect(result).toEqual([sampleTask]);
      expect(mockClient.get).toHaveBeenCalledWith('/tasks');
    });
  });

  describe('getById', () => {
    it('should call GET /tasks/:id', async () => {
      mockClient.get.mockResolvedValue(sampleTask);

      const result = await api.getById('task-1');

      expect(result).toEqual(sampleTask);
      expect(mockClient.get).toHaveBeenCalledWith('/tasks/task-1');
    });
  });

  describe('create', () => {
    it('should call POST /tasks with the DTO', async () => {
      const dto = {
        title: 'New Task',
        status: TaskStatus.Open,
        category: TaskCategory.Work,
        organizationId: 'org-1',
      };
      mockClient.post.mockResolvedValue({ id: 'task-new', ...dto });

      const result = await api.create(dto);

      expect(result.title).toBe('New Task');
      expect(mockClient.post).toHaveBeenCalledWith('/tasks', dto);
    });
  });

  describe('update', () => {
    it('should call PUT /tasks/:id with the DTO', async () => {
      const dto = { title: 'Updated' };
      mockClient.put.mockResolvedValue({ ...sampleTask, title: 'Updated' });

      const result = await api.update('task-1', dto);

      expect(result.title).toBe('Updated');
      expect(mockClient.put).toHaveBeenCalledWith('/tasks/task-1', dto);
    });
  });

  describe('remove', () => {
    it('should call DELETE /tasks/:id', async () => {
      mockClient.delete.mockResolvedValue(undefined);

      await api.remove('task-1');

      expect(mockClient.delete).toHaveBeenCalledWith('/tasks/task-1');
    });
  });
});

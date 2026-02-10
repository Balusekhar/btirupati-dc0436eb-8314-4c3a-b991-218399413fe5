import { TestBed } from '@angular/core/testing';
import { TasksStore } from './tasks-store';
import { TasksApi } from './tasks-api';
import { TaskCategory, TaskStatus } from '@org/data';
import type { ApiTask } from './task.types';

describe('TasksStore', () => {
  let store: TasksStore;
  let mockApi: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  const sampleTask: ApiTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'A test task',
    status: TaskStatus.Open,
    category: TaskCategory.Work,
    organizationId: 'org-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockApi = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TasksStore,
        { provide: TasksApi, useValue: mockApi },
      ],
    });

    store = TestBed.inject(TasksStore);
  });

  describe('loadTasks', () => {
    it('should set tasks from API response', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);

      await store.loadTasks();

      expect(store.tasks()).toEqual([sampleTask]);
      expect(store.isLoading()).toBe(false);
      expect(store.errorMessage()).toBeNull();
    });

    it('should set error message on failure', async () => {
      mockApi.list.mockRejectedValue(new Error('Network error'));

      await store.loadTasks();

      expect(store.tasks()).toEqual([]);
      expect(store.errorMessage()).toBe('Network error');
      expect(store.isLoading()).toBe(false);
    });

    it('should show generic message for non-Error throws', async () => {
      mockApi.list.mockRejectedValue('string error');

      await store.loadTasks();

      expect(store.errorMessage()).toBe('Failed to load tasks');
    });
  });

  describe('createTask', () => {
    it('should add the created task to the front of the list', async () => {
      const newTask = { ...sampleTask, id: 'task-new', title: 'New Task' };
      mockApi.create.mockResolvedValue(newTask);

      // Pre-populate with existing task
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      const result = await store.createTask({
        title: 'New Task',
        status: TaskStatus.Open,
        category: TaskCategory.Work,
        organizationId: 'org-1',
      });

      expect(result).toEqual(newTask);
      expect(store.tasks()).toHaveLength(2);
      expect(store.tasks()[0].id).toBe('task-new');
    });

    it('should return null and set error on failure', async () => {
      mockApi.create.mockRejectedValue(new Error('Create failed'));

      const result = await store.createTask({
        title: 'New Task',
        status: TaskStatus.Open,
        category: TaskCategory.Work,
        organizationId: 'org-1',
      });

      expect(result).toBeNull();
      expect(store.errorMessage()).toBe('Create failed');
    });
  });

  describe('updateTask', () => {
    it('should replace the task in the list with the updated version', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      const updated = { ...sampleTask, title: 'Updated Title' };
      mockApi.update.mockResolvedValue(updated);

      const result = await store.updateTask('task-1', {
        title: 'Updated Title',
      });

      expect(result).toEqual(updated);
      expect(store.tasks()[0].title).toBe('Updated Title');
    });

    it('should return null and set error on failure', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      mockApi.update.mockRejectedValue(new Error('Update failed'));

      const result = await store.updateTask('task-1', {
        title: 'Updated',
      });

      expect(result).toBeNull();
      expect(store.errorMessage()).toBe('Update failed');
    });
  });

  describe('deleteTask', () => {
    it('should remove the task from the list', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      mockApi.remove.mockResolvedValue(undefined);

      const result = await store.deleteTask('task-1');

      expect(result).toBe(true);
      expect(store.tasks()).toHaveLength(0);
    });

    it('should return false and set error on failure', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      mockApi.remove.mockRejectedValue(new Error('Delete failed'));

      const result = await store.deleteTask('task-1');

      expect(result).toBe(false);
      expect(store.errorMessage()).toBe('Delete failed');
    });
  });

  describe('updateTaskStatusOptimistic', () => {
    it('should optimistically update the task status', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      mockApi.update.mockResolvedValue({
        ...sampleTask,
        status: TaskStatus.InProgress,
      });

      await store.updateTaskStatusOptimistic('task-1', TaskStatus.InProgress);

      expect(store.tasks()[0].status).toBe(TaskStatus.InProgress);
    });

    it('should revert status on API failure', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      mockApi.update.mockRejectedValue(new Error('API error'));

      await store.updateTaskStatusOptimistic('task-1', TaskStatus.InProgress);

      expect(store.tasks()[0].status).toBe(TaskStatus.Open);
      expect(store.errorMessage()).toBe('API error');
    });

    it('should do nothing if task not found', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      await store.updateTaskStatusOptimistic(
        'nonexistent',
        TaskStatus.InProgress,
      );

      expect(mockApi.update).not.toHaveBeenCalled();
    });

    it('should do nothing if status is the same', async () => {
      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      await store.updateTaskStatusOptimistic('task-1', TaskStatus.Open);

      expect(mockApi.update).not.toHaveBeenCalled();
    });
  });

  describe('taskCount', () => {
    it('should reflect the number of tasks', async () => {
      expect(store.taskCount()).toBe(0);

      mockApi.list.mockResolvedValue([sampleTask]);
      await store.loadTasks();

      expect(store.taskCount()).toBe(1);
    });
  });

  describe('clearError', () => {
    it('should clear the error message', async () => {
      mockApi.list.mockRejectedValue(new Error('Error'));
      await store.loadTasks();

      expect(store.errorMessage()).toBe('Error');

      store.clearError();

      expect(store.errorMessage()).toBeNull();
    });
  });
});

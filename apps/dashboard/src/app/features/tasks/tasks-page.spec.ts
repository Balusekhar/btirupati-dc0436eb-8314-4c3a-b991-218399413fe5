import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TasksPage } from './tasks-page';
import { TasksStore } from './tasks-store';
import { TasksApi } from './tasks-api';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { OrganizationsApi } from '../../core/organizations/organizations-api';
import { ApiClientService } from '../../core/http/api-client.service';
import { TaskCategory, TaskStatus } from '@org/data';
import { signal } from '@angular/core';
import type { ApiTask } from './task.types';

describe('TasksPage', () => {
  let component: TasksPage;
  let fixture: ComponentFixture<TasksPage>;

  const sampleTask: ApiTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'A test',
    status: TaskStatus.Open,
    category: TaskCategory.Work,
    organizationId: 'org-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  let mockTasksStore: {
    isLoading: ReturnType<typeof signal<boolean>>;
    errorMessage: ReturnType<typeof signal<string | null>>;
    tasks: ReturnType<typeof signal<ApiTask[]>>;
    loadTasks: ReturnType<typeof vi.fn>;
    createTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };

  let mockOrgsApi: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  let mockTokenStorage: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    jwtPayload: ReturnType<typeof signal<Record<string, unknown> | null>>;
    getAccessToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockTasksStore = {
      isLoading: signal(false),
      errorMessage: signal(null),
      tasks: signal([]),
      loadTasks: vi.fn().mockResolvedValue(undefined),
      createTask: vi.fn(),
      deleteTask: vi.fn(),
      clearError: vi.fn(),
    };

    mockOrgsApi = {
      list: vi.fn().mockResolvedValue([{ id: 'org-1', name: 'Test Org' }]),
      create: vi.fn(),
    };

    mockTokenStorage = {
      isAuthenticated: signal(true),
      jwtPayload: signal({ organizationId: 'org-1' }),
      getAccessToken: vi.fn().mockReturnValue('token'),
    };

    await TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [
        { provide: TasksStore, useValue: mockTasksStore },
        { provide: OrganizationsApi, useValue: mockOrgsApi },
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: TasksApi, useValue: { list: vi.fn() } },
        { provide: ApiClientService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tasks on init', () => {
    expect(mockTasksStore.loadTasks).toHaveBeenCalled();
  });

  it('should load organizations on init', () => {
    expect(mockOrgsApi.list).toHaveBeenCalled();
  });

  describe('filters and sorting', () => {
    it('should default to showing all tasks', () => {
      expect(component.statusFilter()).toBe('all');
      expect(component.categoryFilter()).toBe('all');
    });

    it('should reset filters and sort', () => {
      component.statusFilter.set(TaskStatus.Open);
      component.categoryFilter.set(TaskCategory.Work);
      component.sortKey.set('title');
      component.sortDir.set('asc');

      component.resetFiltersAndSort();

      expect(component.statusFilter()).toBe('all');
      expect(component.categoryFilter()).toBe('all');
      expect(component.sortKey()).toBe('createdAt');
      expect(component.sortDir()).toBe('desc');
    });

    it('should compute visibleTasks with status filter', () => {
      mockTasksStore.tasks.set([
        sampleTask,
        {
          ...sampleTask,
          id: 'task-2',
          status: TaskStatus.Completed,
        },
      ]);

      component.statusFilter.set(TaskStatus.Open);

      expect(component.visibleTasks()).toHaveLength(1);
      expect(component.visibleTasks()[0].id).toBe('task-1');
    });

    it('should compute visibleTasks with category filter', () => {
      mockTasksStore.tasks.set([
        sampleTask,
        {
          ...sampleTask,
          id: 'task-2',
          category: TaskCategory.Personal,
        },
      ]);

      component.categoryFilter.set(TaskCategory.Work);

      expect(component.visibleTasks()).toHaveLength(1);
      expect(component.visibleTasks()[0].id).toBe('task-1');
    });
  });

  describe('create task dialog', () => {
    it('should open create dialog', () => {
      component.openCreate();
      expect(component.isCreateOpen()).toBe(true);
    });

    it('should close create dialog', () => {
      component.openCreate();
      component.closeCreate();
      expect(component.isCreateOpen()).toBe(false);
    });
  });

  describe('delete confirmation', () => {
    it('should set delete target on confirmRemove', () => {
      component.confirmRemove(sampleTask);
      expect(component.deleteTarget()).toEqual(sampleTask);
      expect(component.isDeleteOpen()).toBe(true);
    });

    it('should clear delete target on cancelDelete', () => {
      component.confirmRemove(sampleTask);
      component.cancelDelete();
      expect(component.deleteTarget()).toBeNull();
      expect(component.isDeleteOpen()).toBe(false);
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(200);
      const result = component.truncate(longText, 100);
      expect(result.length).toBeLessThanOrEqual(101); // 100 chars + ellipsis
    });

    it('should return original text if short', () => {
      expect(component.truncate('Hello')).toBe('Hello');
    });

    it('should return empty string for null/undefined', () => {
      expect(component.truncate(null)).toBe('');
      expect(component.truncate(undefined)).toBe('');
    });
  });
});

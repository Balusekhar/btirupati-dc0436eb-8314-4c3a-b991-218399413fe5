import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  CreateTaskDto,
  TaskCategory,
  TaskStatus,
} from '@org/data';
import type { ApiTask } from './task.types';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { TasksStore } from './tasks-store';
import { Spinner } from '../../shared/spinner';
import { DialogComponent } from '../../shared/dialog';
import {
  OrganizationsApi,
  type ApiOrganization,
} from '../../core/organizations/organizations-api';
import { TaskBoardView } from './task-board-view';
import { TaskListView } from './task-list-view';

type SortKey = 'createdAt' | 'title' | 'status' | 'dueAt';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'board';

@Component({
  selector: 'app-tasks-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Spinner,
    DialogComponent,
    TaskBoardView,
    TaskListView,
  ],
  templateUrl: './tasks-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  private readonly fb = inject(FormBuilder);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly store = inject(TasksStore);
  private readonly orgsApi = inject(OrganizationsApi);

  readonly isLoading = this.store.isLoading;
  readonly tasks = this.store.tasks;

  // ── Organizations ──
  readonly organizations = signal<ApiOrganization[]>([]);
  readonly hasOrganization = computed(() => this.organizations().length > 0);

  // Create-org dialog
  readonly isCreateOrgOpen = signal(false);
  readonly createOrgError = signal<string | null>(null);
  readonly isCreatingOrg = signal(false);
  readonly newOrgName = signal('');

  // Page-level error
  readonly pageError = signal<string | null>(null);

  // Create task dialog
  readonly isCreateOpen = signal(false);
  readonly createError = signal<string | null>(null);
  readonly isCreateSubmitting = signal(false);

  // Delete confirmation dialog
  readonly deleteTarget = signal<ApiTask | null>(null);
  readonly isDeleteOpen = computed(() => this.deleteTarget() !== null);

  // UI state
  readonly viewMode = signal<ViewMode>('list');
  readonly statusFilter = signal<TaskStatus | 'all'>('all');
  readonly categoryFilter = signal<TaskCategory | 'all'>('all');
  readonly sortKey = signal<SortKey>('createdAt');
  readonly sortDir = signal<SortDir>('desc');

  readonly statusOptions: readonly TaskStatus[] = [
    TaskStatus.Open,
    TaskStatus.InProgress,
    TaskStatus.Completed,
    TaskStatus.Archived,
  ];
  readonly categoryOptions: readonly TaskCategory[] = [
    TaskCategory.Work,
    TaskCategory.Personal,
  ];

  readonly visibleTasks = computed(() => {
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const key = this.sortKey();
    const dir = this.sortDir();

    const filtered = this.tasks().filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (category !== 'all' && t.category !== category) return false;
      return true;
    });

    const statusOrder: Record<TaskStatus, number> = {
      [TaskStatus.Open]: 0,
      [TaskStatus.InProgress]: 1,
      [TaskStatus.Completed]: 2,
      [TaskStatus.Archived]: 3,
    };

    const mult = dir === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      if (key === 'title') return mult * a.title.localeCompare(b.title);
      if (key === 'status') return mult * (statusOrder[a.status] - statusOrder[b.status]);
      if (key === 'dueAt') {
        const aMs = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
        const bMs = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
        return mult * (aMs - bMs);
      }
      return mult * (Date.parse(a.createdAt) - Date.parse(b.createdAt));
    });

    return sorted;
  });

  readonly boardColumns = computed(() => {
    const category = this.categoryFilter();
    const key = this.sortKey();
    const dir = this.sortDir();

    const base = this.tasks().filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      return true;
    });

    const statusOrder: Record<TaskStatus, number> = {
      [TaskStatus.Open]: 0,
      [TaskStatus.InProgress]: 1,
      [TaskStatus.Completed]: 2,
      [TaskStatus.Archived]: 3,
    };

    const mult = dir === 'asc' ? 1 : -1;
    const effectiveKey: SortKey = key === 'status' ? 'createdAt' : key;
    const sorted = [...base].sort((a, b) => {
      if (effectiveKey === 'title') return mult * a.title.localeCompare(b.title);
      if (effectiveKey === 'dueAt') {
        const aMs = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
        const bMs = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
        return mult * (aMs - bMs);
      }
      const t = mult * (Date.parse(a.createdAt) - Date.parse(b.createdAt));
      if (t !== 0) return t;
      const s = statusOrder[a.status] - statusOrder[b.status];
      return s !== 0 ? s : a.title.localeCompare(b.title);
    });

    return {
      [TaskStatus.Open]: sorted.filter((t) => t.status === TaskStatus.Open),
      [TaskStatus.InProgress]: sorted.filter((t) => t.status === TaskStatus.InProgress),
      [TaskStatus.Completed]: sorted.filter((t) => t.status === TaskStatus.Completed),
      [TaskStatus.Archived]: sorted.filter((t) => t.status === TaskStatus.Archived),
    } satisfies Record<TaskStatus, ApiTask[]>;
  });

  readonly createForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(500)]],
    description: [''],
    status: [TaskStatus.Open as TaskStatus, [Validators.required]],
    category: [TaskCategory.Work as TaskCategory, [Validators.required]],
    organizationId: ['', [Validators.required]],
  });

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    await Promise.all([this.load(), this.loadOrganizations()]);
  }

  // ── Organizations ──

  async loadOrganizations(): Promise<void> {
    try {
      const orgs = await this.orgsApi.list();
      this.organizations.set(orgs);
      if (orgs.length > 0 && !this.createForm.controls.organizationId.value) {
        this.createForm.controls.organizationId.setValue(orgs[0].id);
      }
    } catch {
      this.organizations.set([]);
    }
  }

  openCreateOrg(): void {
    this.createOrgError.set(null);
    this.newOrgName.set('');
    this.isCreateOrgOpen.set(true);
  }

  closeCreateOrg(): void {
    this.isCreateOrgOpen.set(false);
    this.createOrgError.set(null);
  }

  async submitCreateOrg(): Promise<void> {
    const name = this.newOrgName().trim();
    if (!name) {
      this.createOrgError.set('Organization name is required.');
      return;
    }

    this.createOrgError.set(null);
    this.isCreatingOrg.set(true);
    try {
      const created = await this.orgsApi.create({ name });
      await this.loadOrganizations();
      this.createForm.controls.organizationId.setValue(created.id);
      this.closeCreateOrg();
    } catch (e) {
      this.createOrgError.set(e instanceof Error ? e.message : 'Failed to create organization.');
    } finally {
      this.isCreatingOrg.set(false);
    }
  }

  // ── Tasks load ──

  async load(): Promise<void> {
    this.pageError.set(null);
    try {
      await this.store.loadTasks();
      const storeErr = this.store.errorMessage();
      if (storeErr) this.pageError.set(storeErr);
    } catch (e) {
      this.pageError.set(e instanceof Error ? e.message : 'Failed to load tasks');
    }
  }

  dismissPageError(): void {
    this.pageError.set(null);
    this.store.clearError();
  }

  // ── View / Filter ──

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'board') {
      this.statusFilter.set('all');
      this.closeCreate();
    }
  }

  resetFiltersAndSort(): void {
    this.statusFilter.set('all');
    this.categoryFilter.set('all');
    this.sortKey.set('createdAt');
    this.sortDir.set('desc');
  }

  // ── Create task ──

  openCreate(): void {
    this.createError.set(null);
    const jwtOrg = this.tokenStorage.jwtPayload()?.organizationId;
    if (jwtOrg) {
      this.createForm.controls.organizationId.setValue(jwtOrg);
    } else if (this.organizations().length > 0) {
      this.createForm.controls.organizationId.setValue(this.organizations()[0].id);
    }
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.createError.set(null);
  }

  private resetCreateForm(): void {
    const orgId = this.createForm.controls.organizationId.value;
    this.createForm.reset({
      title: '',
      description: '',
      status: TaskStatus.Open,
      category: TaskCategory.Work,
      organizationId: orgId,
    });
  }

  async submitCreate(): Promise<void> {
    this.createError.set(null);

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.createError.set('Please fill in all required fields.');
      return;
    }

    this.isCreateSubmitting.set(true);
    try {
      const raw = this.createForm.getRawValue();
      const dto: CreateTaskDto = {
        title: raw.title,
        description: raw.description || undefined,
        status: raw.status,
        category: raw.category,
        organizationId: raw.organizationId,
      };

      const created = await this.store.createTask(dto);
      if (created) {
        this.resetCreateForm();
        this.isCreateOpen.set(false);
      } else {
        this.createError.set(this.store.errorMessage() ?? 'Failed to create task.');
      }
    } catch (e) {
      this.createError.set(e instanceof Error ? e.message : 'Failed to create task.');
    } finally {
      this.isCreateSubmitting.set(false);
    }
  }

  // ── Delete with accessible confirmation ──

  confirmRemove(task: ApiTask): void {
    this.deleteTarget.set(task);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  async performDelete(): Promise<void> {
    const task = this.deleteTarget();
    if (!task) return;

    this.pageError.set(null);
    try {
      const deleted = await this.store.deleteTask(task.id);
      if (!deleted) {
        this.pageError.set(this.store.errorMessage() ?? 'Failed to delete task.');
      }
    } catch (e) {
      this.pageError.set(e instanceof Error ? e.message : 'Failed to delete task.');
    } finally {
      this.deleteTarget.set(null);
    }
  }

  // ── Board error handler ──

  onBoardError(message: string): void {
    this.pageError.set(message);
  }

  truncate(text: string | null | undefined, max = 140): string {
    if (!text) return '';
    const t = text.trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
}

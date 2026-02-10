import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import type { CreateTaskDto, TaskStatus, UpdateTaskDto } from '@org/data';
import type { ApiTask, TaskCategory } from './task.types';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { TasksStore } from './tasks-store';
import { Spinner } from '../../shared/spinner';
import { DialogComponent } from '../../shared/dialog';
import {
  OrganizationsApi,
  type ApiOrganization,
} from '../../core/organizations/organizations-api';

type SortKey = 'createdAt' | 'title' | 'status' | 'dueAt';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'board';

@Component({
  selector: 'app-tasks-page',
  imports: [CommonModule, ReactiveFormsModule, DragDropModule, Spinner, DialogComponent],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.css',
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

  // Edit-local state
  readonly editingTaskId = signal<string | null>(null);
  readonly editError = signal<string | null>(null);
  readonly isEditSubmitting = signal(false);

  // UI state
  readonly viewMode = signal<ViewMode>('list');
  readonly statusFilter = signal<TaskStatus | 'all'>('all');
  readonly categoryFilter = signal<TaskCategory | 'all'>('all');
  readonly sortKey = signal<SortKey>('createdAt');
  readonly sortDir = signal<SortDir>('desc');

  readonly statusOptions: readonly TaskStatus[] = [
    'open',
    'in_progress',
    'completed',
    'archived',
  ];
  readonly categoryOptions: readonly TaskCategory[] = ['work', 'personal'];

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
      open: 0,
      in_progress: 1,
      completed: 2,
      archived: 3,
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
      open: 0,
      in_progress: 1,
      completed: 2,
      archived: 3,
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
      open: sorted.filter((t) => t.status === 'open'),
      in_progress: sorted.filter((t) => t.status === 'in_progress'),
      completed: sorted.filter((t) => t.status === 'completed'),
      archived: sorted.filter((t) => t.status === 'archived'),
    } satisfies Record<TaskStatus, ApiTask[]>;
  });

  readonly createForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(500)]],
    description: [''],
    status: ['open' as TaskStatus, [Validators.required]],
    category: ['work' as TaskCategory, [Validators.required]],
    organizationId: ['', [Validators.required]],
  });

  readonly editForm = this.fb.group({
    title: this.fb.control<string | null>(null),
    description: this.fb.control<string | null>(null),
    dueAt: this.fb.control<string | null>(null),
    status: this.fb.control<TaskStatus | null>(null),
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

      // Auto-select the first org if available
      if (orgs.length > 0 && !this.createForm.controls.organizationId.value) {
        this.createForm.controls.organizationId.setValue(orgs[0].id);
      }
    } catch {
      // Non-fatal — the dropdown will just be empty
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
      // Refresh the list
      await this.loadOrganizations();
      // Auto-select the newly created org
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
      this.cancelEdit();
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
    // Pre-select the user's org if they have one
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
      status: 'open',
      category: 'work',
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

  // ── Edit ──

  startEdit(task: ApiTask): void {
    this.editingTaskId.set(task.id);
    this.editError.set(null);
    this.editForm.reset({
      title: task.title,
      description: task.description ?? '',
      dueAt: task.dueAt ?? null,
      status: task.status,
    });
  }

  cancelEdit(): void {
    this.editingTaskId.set(null);
    this.editError.set(null);
    this.editForm.reset();
  }

  async submitEdit(task: ApiTask): Promise<void> {
    if (!this.editingTaskId()) return;

    this.editError.set(null);
    this.isEditSubmitting.set(true);

    try {
      const raw = this.editForm.getRawValue();
      const dto: UpdateTaskDto = {
        ...(raw.title != null ? { title: raw.title } : {}),
        ...(raw.description != null ? { description: raw.description } : {}),
        ...(raw.dueAt != null && raw.dueAt !== '' ? { dueAt: raw.dueAt } : {}),
        ...(raw.status != null ? { status: raw.status } : {}),
      };

      const updated = await this.store.updateTask(task.id, dto);
      if (updated) {
        this.cancelEdit();
      } else {
        this.editError.set(this.store.errorMessage() ?? 'Failed to save changes.');
      }
    } catch (e) {
      this.editError.set(e instanceof Error ? e.message : 'Failed to save changes.');
    } finally {
      this.isEditSubmitting.set(false);
    }
  }

  // ── Drag & drop ──

  async dropToStatus(event: CdkDragDrop<ApiTask[]>, newStatus: TaskStatus): Promise<void> {
    const task = event.item.data as ApiTask | undefined;
    if (!task || task.status === newStatus) return;

    try {
      await this.store.updateTaskStatusOptimistic(task.id, newStatus);
      const storeErr = this.store.errorMessage();
      if (storeErr) this.pageError.set(storeErr);
    } catch (e) {
      this.pageError.set(e instanceof Error ? e.message : 'Failed to move task.');
    }
  }

  // ── Delete ──

  async remove(task: ApiTask): Promise<void> {
    if (!confirm(`Delete task "${task.title}"?`)) return;

    this.pageError.set(null);
    try {
      const deleted = await this.store.deleteTask(task.id);
      if (!deleted) {
        this.pageError.set(this.store.errorMessage() ?? 'Failed to delete task.');
      }
    } catch (e) {
      this.pageError.set(e instanceof Error ? e.message : 'Failed to delete task.');
    }
  }

  truncate(text: string | null | undefined, max = 140): string {
    if (!text) return '';
    const t = text.trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
}

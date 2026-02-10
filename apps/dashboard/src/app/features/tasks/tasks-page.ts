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

type SortKey = 'createdAt' | 'title' | 'status' | 'dueAt';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'board';

@Component({
  selector: 'app-tasks-page',
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  private readonly fb = inject(FormBuilder);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly store = inject(TasksStore);

  readonly isLoading = this.store.isLoading;
  readonly errorMessage = this.store.errorMessage;
  readonly tasks = this.store.tasks;

  // UI state for filtering + sorting (client-side).
  readonly viewMode = signal<ViewMode>('list');
  readonly statusFilter = signal<TaskStatus | 'all'>('all');
  readonly categoryFilter = signal<TaskCategory | 'all'>('all');
  readonly sortKey = signal<SortKey>('createdAt');
  readonly sortDir = signal<SortDir>('desc');

  readonly isCreateOpen = signal(false);
  readonly editingTaskId = signal<string | null>(null);

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
      if (key === 'title') {
        return mult * a.title.localeCompare(b.title);
      }
      if (key === 'status') {
        return mult * (statusOrder[a.status] - statusOrder[b.status]);
      }
      if (key === 'dueAt') {
        const aMs = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
        const bMs = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
        return mult * (aMs - bMs);
      }

      // createdAt
      const aMs = Date.parse(a.createdAt);
      const bMs = Date.parse(b.createdAt);
      return mult * (aMs - bMs);
    });

    return sorted;
  });

  readonly boardColumns = computed(() => {
    // Board is status-based, so we only apply category filter here.
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
      if (effectiveKey === 'title') {
        return mult * a.title.localeCompare(b.title);
      }
      if (effectiveKey === 'dueAt') {
        const aMs = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
        const bMs = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
        return mult * (aMs - bMs);
      }

      // createdAt
      const aMs = Date.parse(a.createdAt);
      const bMs = Date.parse(b.createdAt);
      const t = mult * (aMs - bMs);
      if (t !== 0) return t;

      // Stable fallback by status then title
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
    // Prefill orgId from JWT if present.
    const orgId = this.tokenStorage.jwtPayload()?.organizationId;
    if (orgId) this.createForm.controls.organizationId.setValue(orgId);

    void this.store.loadTasks();
  }

  async load(): Promise<void> {
    await this.store.loadTasks();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'board') {
      // Board view uses status columns; keep status filter off to avoid “disappearing” tasks.
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

  openCreate(): void {
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    const dto: CreateTaskDto = {
      title: raw.title,
      description: raw.description || undefined,
      status: raw.status,
      category: raw.category,
      organizationId: raw.organizationId,
    };

    const created = await this.store.createTask(dto);
    if (!created) return;

    this.closeCreate();
    // Keep orgId in place; reset other fields.
    const orgId = raw.organizationId;
    this.createForm.reset({
      title: '',
      description: '',
      status: 'open',
      category: 'work',
      organizationId: orgId,
    });
  }

  startEdit(task: ApiTask): void {
    this.editingTaskId.set(task.id);
    this.editForm.reset({
      title: task.title,
      description: task.description ?? '',
      dueAt: task.dueAt ?? null,
      status: task.status,
    });
  }

  cancelEdit(): void {
    this.editingTaskId.set(null);
    this.editForm.reset();
  }

  async submitEdit(task: ApiTask): Promise<void> {
    if (!this.editingTaskId()) return;

    const raw = this.editForm.getRawValue();
    const dto: UpdateTaskDto = {
      ...(raw.title != null ? { title: raw.title } : {}),
      ...(raw.description != null ? { description: raw.description } : {}),
      ...(raw.dueAt != null && raw.dueAt !== '' ? { dueAt: raw.dueAt } : {}),
      ...(raw.status != null ? { status: raw.status } : {}),
    };

    const updated = await this.store.updateTask(task.id, dto);
    if (!updated) return;
    this.cancelEdit();
  }

  async dropToStatus(
    event: CdkDragDrop<ApiTask[]>,
    newStatus: TaskStatus,
  ): Promise<void> {
    const task = event.item.data as ApiTask | undefined;
    if (!task) return;
    if (task.status === newStatus) return;
    await this.store.updateTaskStatusOptimistic(task.id, newStatus);
  }

  async remove(task: ApiTask): Promise<void> {
    const ok = confirm(`Delete task "${task.title}"?`);
    if (!ok) return;
    await this.store.deleteTask(task.id);
  }

  truncate(text: string | null | undefined, max = 140): string {
    if (!text) return '';
    const t = text.trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
}

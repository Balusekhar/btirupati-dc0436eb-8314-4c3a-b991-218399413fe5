import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TaskStatus, type UpdateTaskDto } from '@org/data';
import type { ApiTask } from './task.types';
import { TasksStore } from './tasks-store';
import { Spinner } from '../../shared/spinner';

@Component({
  selector: 'app-task-list-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-list-view.html',
})
export class TaskListView {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(TasksStore);

  @Input({ required: true }) tasks!: ApiTask[];
  @Input({ required: true }) statusOptions!: readonly TaskStatus[];
  @Output() removeTask = new EventEmitter<ApiTask>();
  @Output() requestCreate = new EventEmitter<void>();

  readonly editingTaskId = signal<string | null>(null);
  readonly editError = signal<string | null>(null);
  readonly isEditSubmitting = signal(false);

  readonly editForm = this.fb.group({
    title: this.fb.control<string | null>(null),
    description: this.fb.control<string | null>(null),
    dueAt: this.fb.control<string | null>(null),
    status: this.fb.control<TaskStatus | null>(null),
  });

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

  truncate(text: string | null | undefined, max = 140): string {
    if (!text) return '';
    const t = text.trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import type { CreateTaskDto, UpdateTaskDto } from '@org/data';
import type { ApiTask } from './task.types';
import { TasksApi } from './tasks-api';

@Injectable({
  providedIn: 'root',
})
export class TasksStore {
  private readonly api = inject(TasksApi);

  private readonly _isLoading = signal(false);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _tasks = signal<ApiTask[]>([]);

  readonly isLoading = this._isLoading.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly tasks = this._tasks.asReadonly();

  readonly taskCount = computed(() => this._tasks().length);

  clearError(): void {
    this._errorMessage.set(null);
  }

  async loadTasks(): Promise<void> {
    this._errorMessage.set(null);
    this._isLoading.set(true);
    try {
      const data = await this.api.list();
      this._tasks.set(data);
    } catch (e) {
      this._errorMessage.set(
        e instanceof Error ? e.message : 'Failed to load tasks',
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  async createTask(dto: CreateTaskDto): Promise<ApiTask | null> {
    this._errorMessage.set(null);
    this._isLoading.set(true);
    try {
      const created = await this.api.create(dto);
      this._tasks.update((t) => [created, ...t]);
      return created;
    } catch (e) {
      this._errorMessage.set(
        e instanceof Error ? e.message : 'Failed to create task',
      );
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<ApiTask | null> {
    this._errorMessage.set(null);
    this._isLoading.set(true);
    try {
      const updated = await this.api.update(id, dto);
      this._tasks.update((list) => list.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (e) {
      this._errorMessage.set(
        e instanceof Error ? e.message : 'Failed to update task',
      );
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    this._errorMessage.set(null);
    this._isLoading.set(true);
    try {
      await this.api.remove(id);
      this._tasks.update((list) => list.filter((t) => t.id !== id));
      return true;
    } catch (e) {
      this._errorMessage.set(
        e instanceof Error ? e.message : 'Failed to delete task',
      );
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

}

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskStatus } from '@org/data';
import type { ApiTask } from './task.types';
import { TasksStore } from './tasks-store';

@Component({
  selector: 'app-task-board-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-board-view.html',
})
export class TaskBoardView {
  private readonly store = inject(TasksStore);

  @Input({ required: true }) columns!: Record<string, ApiTask[]>;
  @Input({ required: true }) statusOptions!: readonly TaskStatus[];
  @Output() error = new EventEmitter<string>();

  async dropToStatus(event: CdkDragDrop<ApiTask[]>, newStatus: TaskStatus): Promise<void> {
    const task = event.item.data as ApiTask | undefined;
    if (!task || task.status === newStatus) return;

    try {
      await this.store.updateTaskStatusOptimistic(task.id, newStatus);
      const storeErr = this.store.errorMessage();
      if (storeErr) this.error.emit(storeErr);
    } catch (e) {
      this.error.emit(e instanceof Error ? e.message : 'Failed to move task.');
    }
  }

  truncate(text: string | null | undefined, max = 80): string {
    if (!text) return '';
    const t = text.trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
}

import { Injectable, inject } from '@angular/core';
import type { CreateTaskDto, UpdateTaskDto } from '@org/data';
import { ApiClientService } from '../../core/http/api-client.service';
import type { ApiTask } from './task.types';

@Injectable({
  providedIn: 'root',
})
export class TasksApi {
  private readonly api = inject(ApiClientService);

  list(): Promise<ApiTask[]> {
    return this.api.get<ApiTask[]>('/tasks');
  }

  getById(id: string): Promise<ApiTask> {
    return this.api.get<ApiTask>(`/tasks/${id}`);
  }

  create(dto: CreateTaskDto): Promise<ApiTask> {
    return this.api.post<ApiTask>('/tasks', dto);
  }

  update(id: string, dto: UpdateTaskDto): Promise<ApiTask> {
    return this.api.put<ApiTask>(`/tasks/${id}`, dto);
  }

  async remove(id: string): Promise<void> {
    await this.api.delete<void>(`/tasks/${id}`);
  }
}

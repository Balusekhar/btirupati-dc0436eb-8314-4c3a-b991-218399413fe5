import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canAccessTaskOrg, getAccessibleOrgIds } from '@org/auth';
import { CreateTaskDto, UpdateTaskDto } from '@org/data';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Organization, Task, TaskCategory } from '../entities';

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    private audit: AuditService,
  ) {}

  private async getAccessibleOrgIds(userOrgId: string): Promise<string[]> {
    const children = await this.orgRepo.find({
      where: { parentId: userOrgId },
      select: { id: true },
    });
    return getAccessibleOrgIds(userOrgId, children.map((o) => o.id));
  }

  async findAll(user: RequestUser): Promise<Task[]> {
    const orgIds = await this.getAccessibleOrgIds(user.organizationId);
    return this.taskRepo.find({
      where: { organizationId: In(orgIds) },
      relations: ['organization', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: RequestUser): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!task) throw new NotFoundException('Task not found');
    const allowed = canAccessTaskOrg(
      user.organizationId,
      task.organizationId,
      task.organization?.parentId ?? null,
    );
    if (!allowed) throw new ForbiddenException();
    return task;
  }

  async create(dto: CreateTaskDto, user: RequestUser): Promise<Task> {
    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      status: 'open',
      category: TaskCategory.Work,
      organizationId: user.organizationId,
      createdById: user.id,
    });
    const saved = await this.taskRepo.save(task);
    await this.audit.log(
      user.id,
      user.organizationId,
      'task:create',
      'task',
      saved.id,
      { title: saved.title },
    );
    return saved;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    user: RequestUser,
  ): Promise<Task> {
    const task = await this.findOne(id, user);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status as Task['status'];
    const saved = await this.taskRepo.save(task);
    await this.audit.log(
      user.id,
      user.organizationId,
      'task:update',
      'task',
      saved.id,
      { title: saved.title, status: saved.status },
    );
    return saved;
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const task = await this.findOne(id, user);
    await this.audit.log(
      user.id,
      user.organizationId,
      'task:delete',
      'task',
      task.id,
      { title: task.title },
    );
    await this.taskRepo.remove(task);
  }
}

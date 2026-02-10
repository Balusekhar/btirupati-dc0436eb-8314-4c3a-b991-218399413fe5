import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  PermissionsGuard,
  RequirePermission,
  RequestWithUser,
} from '@org/auth';
import { CreateTaskDto, Permission, UpdateTaskDto } from '@org/data';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(PermissionsGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get()
  @RequirePermission(Permission.TaskRead)
  async findAll(@Req() req: RequestWithUser) {
    return this.tasks.findAll(req.user!);
  }

  @Get(':id')
  @RequirePermission(Permission.TaskRead)
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.tasks.findOne(id, req.user!);
  }

  @Post()
  @RequirePermission(Permission.TaskCreate)
  async create(@Body() dto: CreateTaskDto, @Req() req: RequestWithUser) {
    return this.tasks.create(dto, req.user!);
  }

  @Put(':id')
  @RequirePermission(Permission.TaskUpdate)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tasks.update(id, dto, req.user!);
  }

  @Delete(':id')
  @RequirePermission(Permission.TaskDelete)
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.tasks.remove(id, req.user!);
  }
}

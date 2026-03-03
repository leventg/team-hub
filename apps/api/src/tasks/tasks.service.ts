import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { ResourceNotFoundException } from '../common/exceptions';

export interface TaskFilter {
  status?: TaskStatus;
  assigneeId?: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
  ) {}

  async create(dto: CreateTaskDto, reporterId: string): Promise<Task> {
    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description || null,
      priority: dto.priority,
      assigneeId: dto.assigneeId || null,
      reporterId,
      createdBy: reporterId,
      updatedBy: reporterId,
    });

    const saved = await this.taskRepository.save(task);
    this.logger.log(`Task created: ${saved.id} "${saved.title}"`);
    return this.findById(saved.id);
  }

  async findAll(filter?: TaskFilter): Promise<Task[]> {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.assigneeId) where.assigneeId = filter.assigneeId;

    return this.taskRepository.find({
      where,
      relations: ['assignee', 'reporter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignee', 'reporter', 'comments', 'comments.author'],
    });
    if (!task) {
      throw new ResourceNotFoundException('Task', id);
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, updatedBy: string): Promise<Task> {
    const task = await this.findById(id);

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.assigneeId !== undefined) task.assigneeId = dto.assigneeId;
    task.updatedBy = updatedBy;

    await this.taskRepository.save(task);
    this.logger.log(`Task updated: ${id} by ${updatedBy}`);
    return this.findById(id);
  }

  async addComment(taskId: string, dto: CreateTaskCommentDto, authorId: string): Promise<TaskComment> {
    // Verify task exists
    await this.findById(taskId);

    const comment = this.commentRepository.create({
      taskId,
      authorId,
      content: dto.content,
      createdBy: authorId,
      updatedBy: authorId,
    });

    return this.commentRepository.save(comment);
  }
}

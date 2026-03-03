import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import {
  AuthorizationException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @Optional()
    private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async create(dto: CreateMessageDto, authorId: string): Promise<Message> {
    const message = this.messageRepository.create({
      channelId: dto.channelId,
      content: dto.content,
      parentId: dto.parentId || null,
      authorId,
      createdBy: authorId,
      updatedBy: authorId,
    });

    const saved = await this.messageRepository.save(message);
    this.logger.log(`Message created in channel ${dto.channelId} by ${authorId}`);

    const full = await this.findById(saved.id);

    // Broadcast to channel room
    this.realtimeGateway?.broadcastToChannel(dto.channelId, 'message:new', full);

    return full;
  }

  async findByChannel(
    channelId: string,
    query: MessageQueryDto,
  ): Promise<PaginatedResult<Message>> {
    const qb = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.author', 'author')
      .where('message.channel_id = :channelId', { channelId })
      .andWhere('message.deleted_at IS NULL');

    // Only top-level messages by default (not thread replies)
    if (query.parentId) {
      qb.andWhere('message.parent_id = :parentId', { parentId: query.parentId });
    } else {
      qb.andWhere('message.parent_id IS NULL');
    }

    // Full-text search
    if (query.search) {
      qb.andWhere('message.search_vector @@ plainto_tsquery(:search)', {
        search: query.search,
      });
    }

    const totalItems = await qb.getCount();
    const totalPages = Math.ceil(totalItems / query.size);

    const items = await qb
      .orderBy('message.created_at', 'DESC')
      .skip((query.page - 1) * query.size)
      .take(query.size)
      .getMany();

    return {
      items,
      pagination: {
        page: query.page,
        size: query.size,
        totalItems,
        totalPages,
      },
    };
  }

  async findById(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['author'],
    });
    if (!message) {
      throw new ResourceNotFoundException('Message', id);
    }
    return message;
  }

  async getThreadReplies(parentId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { parentId, deletedAt: IsNull() },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateMessageDto, userId: string): Promise<Message> {
    const message = await this.findById(id);

    if (message.authorId !== userId) {
      throw new AuthorizationException('You can only edit your own messages');
    }

    message.content = dto.content;
    message.editedAt = new Date();
    message.updatedBy = userId;

    await this.messageRepository.save(message);
    return this.findById(id);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const message = await this.findById(id);

    if (message.authorId !== userId) {
      throw new AuthorizationException('You can only delete your own messages');
    }

    message.deletedAt = new Date();
    message.deletedBy = userId;
    await this.messageRepository.save(message);

    this.logger.log(`Message ${id} soft-deleted by ${userId}`);
  }
}

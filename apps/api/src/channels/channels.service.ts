import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import {
  BusinessException,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private readonly memberRepository: Repository<ChannelMember>,
  ) {}

  async create(dto: CreateChannelDto, createdBy: string): Promise<Channel> {
    const existing = await this.channelRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ResourceAlreadyExistsException('Channel', 'name', dto.name);
    }

    const channel = this.channelRepository.create({
      ...dto,
      createdBy,
      updatedBy: createdBy,
    });

    return this.channelRepository.save(channel);
  }

  async findAll(includeArchived = false): Promise<Channel[]> {
    const where = includeArchived ? {} : { isArchived: false };
    return this.channelRepository.find({
      where,
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
    if (!channel) {
      throw new ResourceNotFoundException('Channel', id);
    }
    return channel;
  }

  async findByName(name: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({ where: { name } });
    if (!channel) {
      throw new ResourceNotFoundException('Channel', name);
    }
    return channel;
  }

  async update(id: string, dto: UpdateChannelDto, updatedBy: string): Promise<Channel> {
    const channel = await this.findById(id);
    Object.assign(channel, dto, { updatedBy });
    return this.channelRepository.save(channel);
  }

  async addMember(channelId: string, userId: string, addedBy: string): Promise<ChannelMember> {
    const existing = await this.memberRepository.findOne({
      where: { channelId, userId },
    });
    if (existing) {
      throw new BusinessException('BUS_ALREADY_MEMBER', 'User is already a member of this channel');
    }

    const member = this.memberRepository.create({
      channelId,
      userId,
      createdBy: addedBy,
      updatedBy: addedBy,
    });

    this.logger.log(`User ${userId} added to channel ${channelId}`);
    return this.memberRepository.save(member);
  }

  async removeMember(channelId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { channelId, userId },
    });
    if (!member) {
      throw new ResourceNotFoundException('ChannelMember', `${channelId}/${userId}`);
    }
    await this.memberRepository.remove(member);
  }

  async getMembers(channelId: string): Promise<ChannelMember[]> {
    return this.memberRepository.find({
      where: { channelId },
      relations: ['user'],
    });
  }

  async getUserChannels(userId: string): Promise<Channel[]> {
    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: ['channel'],
    });
    return memberships.map((m) => m.channel);
  }
}

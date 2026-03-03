import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResourceNotFoundException, ResourceAlreadyExistsException } from '../common/exceptions';
import { ApiKeyStrategy } from '../auth/strategies/api-key.strategy';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto, createdBy?: string): Promise<User> {
    if (dto.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ResourceAlreadyExistsException('User', 'email', dto.email);
      }
    }

    const user = this.userRepository.create({
      ...dto,
      createdBy,
      updatedBy: createdBy,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      order: { displayName: 'ASC' },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto, updatedBy?: string): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto, { updatedBy });
    return this.userRepository.save(user);
  }

  async generateApiKey(userId: string): Promise<{ apiKey: string }> {
    const user = await this.findById(userId);
    const apiKey = `thub_${randomBytes(32).toString('hex')}`;
    user.apiKeyHash = ApiKeyStrategy.hashApiKey(apiKey);
    await this.userRepository.save(user);

    this.logger.log(`API key generated for user ${userId}`);
    return { apiKey };
  }
}

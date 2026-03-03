import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ApiKeyStrategy {
  private readonly logger = new Logger(ApiKeyStrategy.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async validate(apiKey: string): Promise<User | null> {
    const hash = createHash('sha256').update(apiKey).digest('hex');

    const user = await this.userRepository.findOne({
      where: { apiKeyHash: hash, isActive: true },
    });

    if (!user) {
      this.logger.warn('Invalid API key attempt');
      return null;
    }

    // Update last seen
    await this.userRepository.update(user.id, { lastSeenAt: new Date() });

    return user;
  }

  static hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}

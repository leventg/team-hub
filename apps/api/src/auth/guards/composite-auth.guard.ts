import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ApiKeyStrategy } from '../strategies/api-key.strategy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuthenticationException } from '../../common/exceptions';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CompositeAuthGuard implements CanActivate {
  private readonly logger = new Logger(CompositeAuthGuard.name);
  private readonly jwtGuard: CanActivate;

  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeyStrategy: ApiKeyStrategy,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.jwtGuard = new (AuthGuard('jwt'))();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // Try API key first (for AI agents via MCP)
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      const user = await this.apiKeyStrategy.validate(apiKey);
      if (user) {
        (request as any).user = user;
        return true;
      }
    }

    // Try JWT (for humans via browser)
    try {
      const result = await this.jwtGuard.canActivate(context);
      if (result) {
        // Resolve JWT user to our User entity
        const jwtUser = (request as any).user;
        if (jwtUser?.keycloakId) {
          const user = await this.userRepository.findOne({
            where: { keycloakId: jwtUser.keycloakId, isActive: true },
          });
          if (user) {
            (request as any).user = user;
            await this.userRepository.update(user.id, { lastSeenAt: new Date() });
            return true;
          }
        }
      }
    } catch {
      // JWT validation failed — fall through to unauthorized
    }

    throw new AuthenticationException();
  }
}

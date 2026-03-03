import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { CompositeAuthGuard } from './guards/composite-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { APP_GUARD } from '@nestjs/core';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    JwtStrategy,
    ApiKeyStrategy,
    CompositeAuthGuard,
    RolesGuard,
    // Register as global guards
    { provide: APP_GUARD, useClass: CompositeAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [ApiKeyStrategy, CompositeAuthGuard],
})
export class AuthModule {}

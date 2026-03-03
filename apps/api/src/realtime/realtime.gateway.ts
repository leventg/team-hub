import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ApiKeyStrategy } from '../auth/strategies/api-key.strategy';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedUsers = new Map<string, { socketId: string; user: User }>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly apiKeyStrategy: ApiKeyStrategy,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.authenticateSocket(client);
      if (!user) {
        client.disconnect();
        return;
      }

      this.connectedUsers.set(client.id, { socketId: client.id, user });
      this.logger.log(`User connected: ${user.displayName} (${client.id})`);

      // Broadcast updated presence
      this.server.emit('presence:update', this.getOnlineUsers());
    } catch (error) {
      this.logger.warn(`Socket auth failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const entry = this.connectedUsers.get(client.id);
    if (entry) {
      this.logger.log(`User disconnected: ${entry.user.displayName} (${client.id})`);
      this.connectedUsers.delete(client.id);
      this.server.emit('presence:update', this.getOnlineUsers());
    }
  }

  @SubscribeMessage('channel:join')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ): void {
    const room = `channel:${data.channelId}`;
    client.join(room);
    this.logger.debug(`${client.id} joined ${room}`);
  }

  @SubscribeMessage('channel:leave')
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ): void {
    const room = `channel:${data.channelId}`;
    client.leave(room);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ): void {
    const entry = this.connectedUsers.get(client.id);
    if (!entry) return;

    client.to(`channel:${data.channelId}`).emit('typing:update', {
      channelId: data.channelId,
      userId: entry.user.id,
      displayName: entry.user.displayName,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ): void {
    const entry = this.connectedUsers.get(client.id);
    if (!entry) return;

    client.to(`channel:${data.channelId}`).emit('typing:update', {
      channelId: data.channelId,
      userId: entry.user.id,
      displayName: entry.user.displayName,
      isTyping: false,
    });
  }

  // Called by services to broadcast events
  broadcastToChannel(channelId: string, event: string, data: any): void {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: any): void {
    this.server.emit(event, data);
  }

  private async authenticateSocket(client: Socket): Promise<User | null> {
    // Try API key from query params (for AI agents)
    const apiKey = client.handshake.auth?.apiKey || client.handshake.query?.apiKey;
    if (apiKey) {
      return this.apiKeyStrategy.validate(apiKey as string);
    }

    // Try JWT token from auth header (for browser clients)
    const token = client.handshake.auth?.token;
    if (token) {
      // For now, look up by keycloak ID extracted from token
      // Full JWT validation would require passport integration here
      // In production, decode and verify the JWT properly
      const user = await this.userRepository.findOne({
        where: { keycloakId: token, isActive: true },
      });
      return user;
    }

    return null;
  }

  private getOnlineUsers(): Array<{ id: string; displayName: string; role: string }> {
    const users: Array<{ id: string; displayName: string; role: string }> = [];
    const seen = new Set<string>();

    for (const entry of this.connectedUsers.values()) {
      if (!seen.has(entry.user.id)) {
        seen.add(entry.user.id);
        users.push({
          id: entry.user.id,
          displayName: entry.user.displayName,
          role: entry.user.role,
        });
      }
    }
    return users;
  }
}

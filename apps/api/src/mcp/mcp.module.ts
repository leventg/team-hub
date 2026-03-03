import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpServerProvider } from './mcp.server';
import { MessagesModule } from '../messages/messages.module';
import { ChannelsModule } from '../channels/channels.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [MessagesModule, ChannelsModule, DecisionsModule, TasksModule],
  controllers: [McpController],
  providers: [McpServerProvider],
})
export class McpModule {}

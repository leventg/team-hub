import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MessagesService } from '../messages/messages.service';
import { ChannelsService } from '../channels/channels.service';
import { DecisionsService } from '../decisions/decisions.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class McpServerProvider implements OnModuleInit {
  private readonly logger = new Logger(McpServerProvider.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly channelsService: ChannelsService,
    private readonly decisionsService: DecisionsService,
    private readonly tasksService: TasksService,
  ) {}

  onModuleInit() {
    this.logger.log('MCP Server provider initialized');
  }

  createServer(): McpServer {
    const server = new McpServer({
      name: 'team-hub',
      version: '0.1.0',
    });

    this.registerTools(server);
    return server;
  }

  private registerTools(server: McpServer): void {
    // ── send_message ──
    server.registerTool(
      'send_message',
      {
        description: 'Send a message to a channel',
        inputSchema: {
          channel: z.string().describe('Channel name (e.g. "general", "architecture")'),
          content: z.string().describe('Message content'),
          parentId: z.string().optional().describe('Parent message ID for thread replies'),
        },
      },
      async ({ channel, content, parentId }, extra) => {
        const userId = this.extractUserId(extra);
        const ch = await this.channelsService.findByName(channel);
        const message = await this.messagesService.create(
          { channelId: ch.id, content, parentId },
          userId,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: message.id,
                channel: ch.name,
                author: message.author?.displayName,
                content: message.content,
                createdAt: message.createdAt,
              }),
            },
          ],
        };
      },
    );

    // ── read_messages ──
    server.registerTool(
      'read_messages',
      {
        description: 'Read messages from a channel',
        inputSchema: {
          channel: z.string().describe('Channel name'),
          page: z.number().optional().default(1).describe('Page number'),
          size: z.number().optional().default(20).describe('Page size (max 100)'),
          search: z.string().optional().describe('Full-text search query'),
        },
      },
      async ({ channel, page, size, search }) => {
        const ch = await this.channelsService.findByName(channel);
        const result = await this.messagesService.findByChannel(ch.id, {
          page,
          size: Math.min(size, 100),
          search,
        });
        const formatted = result.items.map((m) => ({
          id: m.id,
          author: m.author?.displayName,
          content: m.content,
          createdAt: m.createdAt,
          editedAt: m.editedAt,
        }));
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ messages: formatted, pagination: result.pagination }),
            },
          ],
        };
      },
    );

    // ── propose_decision ──
    server.registerTool(
      'propose_decision',
      {
        description: 'Propose a decision for the team to vote on',
        inputSchema: {
          channel: z.string().describe('Channel name (usually "decisions")'),
          title: z.string().describe('Decision title'),
          description: z.string().describe('Detailed description of the decision'),
        },
      },
      async ({ channel, title, description }, extra) => {
        const userId = this.extractUserId(extra);
        const ch = await this.channelsService.findByName(channel);
        const decision = await this.decisionsService.create(
          { title, description, channelId: ch.id },
          userId,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: decision.id,
                title: decision.title,
                status: decision.status,
                createdAt: decision.createdAt,
              }),
            },
          ],
        };
      },
    );

    // ── vote_decision ──
    server.registerTool(
      'vote_decision',
      {
        description: 'Vote on a decision (APPROVE, REJECT, or ABSTAIN)',
        inputSchema: {
          decisionId: z.string().describe('Decision ID'),
          value: z.enum(['APPROVE', 'REJECT', 'ABSTAIN']).describe('Vote value'),
          comment: z.string().optional().describe('Optional comment with the vote'),
        },
      },
      async ({ decisionId, value, comment }, extra) => {
        const userId = this.extractUserId(extra);
        const vote = await this.decisionsService.vote(
          { decisionId, value: value as any, comment },
          userId,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ id: vote.id, value: vote.value, comment: vote.comment }),
            },
          ],
        };
      },
    );

    // ── list_decisions ──
    server.registerTool(
      'list_decisions',
      {
        description: 'List decisions, optionally filtered by status',
        inputSchema: {
          status: z
            .enum(['PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN'])
            .optional()
            .describe('Filter by status'),
        },
      },
      async ({ status }) => {
        const decisions = await this.decisionsService.findAll(status as any);
        const formatted = decisions.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          proposer: d.proposer?.displayName,
          createdAt: d.createdAt,
          resolvedAt: d.resolvedAt,
        }));
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ decisions: formatted }) }],
        };
      },
    );

    // ── create_task ──
    server.registerTool(
      'create_task',
      {
        description: 'Create a new task',
        inputSchema: {
          title: z.string().describe('Task title'),
          description: z.string().optional().describe('Task description'),
          priority: z
            .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
            .optional()
            .default('MEDIUM')
            .describe('Task priority'),
          assigneeId: z.string().optional().describe('Assignee user ID'),
        },
      },
      async ({ title, description, priority, assigneeId }, extra) => {
        const userId = this.extractUserId(extra);
        const task = await this.tasksService.create(
          { title, description, priority: priority as any, assigneeId },
          userId,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                createdAt: task.createdAt,
              }),
            },
          ],
        };
      },
    );

    // ── update_task ──
    server.registerTool(
      'update_task',
      {
        description: 'Update a task (status, assignee, priority)',
        inputSchema: {
          taskId: z.string().describe('Task ID'),
          status: z
            .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
            .optional()
            .describe('New task status'),
          assigneeId: z.string().optional().describe('New assignee ID'),
          priority: z
            .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
            .optional()
            .describe('New priority'),
        },
      },
      async ({ taskId, status, assigneeId, priority }, extra) => {
        const userId = this.extractUserId(extra);
        const task = await this.tasksService.update(
          taskId,
          { status: status as any, assigneeId, priority: priority as any },
          userId,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                assignee: task.assignee?.displayName,
              }),
            },
          ],
        };
      },
    );

    // ── list_tasks ──
    server.registerTool(
      'list_tasks',
      {
        description: 'List tasks, optionally filtered by status or assignee',
        inputSchema: {
          status: z
            .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
            .optional()
            .describe('Filter by status'),
          assigneeId: z.string().optional().describe('Filter by assignee ID'),
        },
      },
      async ({ status, assigneeId }) => {
        const tasks = await this.tasksService.findAll({
          status: status as any,
          assigneeId,
        });
        const formatted = tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee?.displayName,
          reporter: t.reporter?.displayName,
          createdAt: t.createdAt,
        }));
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ tasks: formatted }) }],
        };
      },
    );

    this.logger.log('8 MCP tools registered');
  }

  private extractUserId(extra: any): string {
    // The user ID is set by the MCP controller after API key validation
    return extra?.authInfo?.userId || 'unknown';
  }
}

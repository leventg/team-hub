import { All, Controller, Logger, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpServerProvider } from './mcp.server';
import { ApiKeyStrategy } from '../auth/strategies/api-key.strategy';
import { Public } from '../auth/decorators/public.decorator';

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);
  private readonly transports = new Map<string, StreamableHTTPServerTransport>();

  constructor(
    private readonly mcpServerProvider: McpServerProvider,
    private readonly apiKeyStrategy: ApiKeyStrategy,
  ) {}

  @All()
  @Public() // MCP handles its own auth via X-API-Key
  async handleMcp(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Authenticate via API key
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      res.status(401).json({ error: 'X-API-Key header required' });
      return;
    }

    const user = await this.apiKeyStrategy.validate(apiKey);
    if (!user) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const method = req.method;

    if (method === 'POST') {
      await this.handlePost(req, res, user.id);
    } else if (method === 'GET') {
      await this.handleGet(req, res);
    } else if (method === 'DELETE') {
      await this.handleDelete(req, res);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  }

  private async handlePost(req: Request, res: Response, userId: string): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Existing session
    if (sessionId && this.transports.has(sessionId)) {
      const transport = this.transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // New session — must be initialize request
    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          this.transports.set(sid, transport);
          this.logger.log(`MCP session initialized: ${sid} for user ${userId}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          this.transports.delete(transport.sessionId);
          this.logger.log(`MCP session closed: ${transport.sessionId}`);
        }
      };

      // Create a fresh MCP server for this session
      const server = this.mcpServerProvider.createServer();

      // Inject auth info so tools can identify the caller
      (transport as any)._authInfo = { userId };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({ error: 'Invalid request: missing session or not an initialize request' });
  }

  private async handleGet(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string;
    if (!sessionId || !this.transports.has(sessionId)) {
      res.status(400).json({ error: 'Invalid or missing session' });
      return;
    }
    await this.transports.get(sessionId)!.handleRequest(req, res);
  }

  private async handleDelete(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string;
    if (sessionId && this.transports.has(sessionId)) {
      await this.transports.get(sessionId)!.handleRequest(req, res);
    } else {
      res.status(400).json({ error: 'Invalid or missing session' });
    }
  }
}

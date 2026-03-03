import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('/health')
  async check() {
    const dbHealthy = this.dataSource.isInitialized;

    return {
      status: dbHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      checks: {
        database: dbHealthy ? 'up' : 'down',
      },
    };
  }
}

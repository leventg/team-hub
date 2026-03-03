import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = (request as any).traceId || request.headers['x-trace-id'] || '';

    let status = 500;
    let code = 'SYS_INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let errors: any[] = [];

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      errors = exception.fieldErrors || [];

      if (status >= 500) {
        this.logger.error(`${code}: ${message}`, { traceId });
      } else {
        this.logger.warn(`${code}: ${message}`, { traceId });
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const resp = exResponse as any;
        message = resp.message || exception.message;
        // Handle class-validator errors
        if (Array.isArray(resp.message)) {
          code = 'VAL_INVALID_INPUT';
          errors = resp.message.map((msg: string) => ({
            field: '',
            message: msg,
            code: 'VAL_INVALID_INPUT',
          }));
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }
      this.logger.warn(`HTTP ${status}: ${message}`, { traceId });
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack, { traceId });
    } else {
      this.logger.error('Unknown error', { traceId, exception });
    }

    response.status(status).json({
      success: false,
      message,
      code,
      data: null,
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  }
}

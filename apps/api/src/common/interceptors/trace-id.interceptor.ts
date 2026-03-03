import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const traceId = (request.headers['x-trace-id'] as string) || uuidv4();
    (request as any).traceId = traceId;

    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Trace-Id', traceId);

    return next.handle();
  }
}

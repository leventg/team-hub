import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  code: string;
  data: T;
  meta: {
    traceId: string;
    timestamp: string;
    pagination?: {
      page: number;
      size: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const traceId = (request as any).traceId || request.headers['x-trace-id'] || '';

    return next.handle().pipe(
      map((data) => {
        // If response already has our envelope shape, pass through
        if (data && typeof data === 'object' && 'success' in data && 'code' in data) {
          return data;
        }

        // Extract pagination if present
        let responseData = data;
        let pagination: ApiResponse<T>['meta']['pagination'] | undefined;

        if (data && typeof data === 'object' && 'items' in data && 'pagination' in data) {
          responseData = data.items;
          pagination = data.pagination;
        }

        return {
          success: true,
          message: 'OK',
          code: 'SUCCESS',
          data: responseData,
          meta: {
            traceId,
            timestamp: new Date().toISOString(),
            ...(pagination && { pagination }),
          },
        };
      }),
    );
  }
}

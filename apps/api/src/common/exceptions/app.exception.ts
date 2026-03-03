import { HttpException } from '@nestjs/common';

export interface FieldError {
  field: string;
  message: string;
  code: string;
}

export abstract class AppException extends HttpException {
  readonly code: string;
  readonly fieldErrors?: FieldError[];

  constructor(code: string, message: string, status: number, fieldErrors?: FieldError[]) {
    super({ success: false, code, message, data: null }, status);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class ValidationException extends AppException {
  constructor(code: string, message: string, fieldErrors?: FieldError[]) {
    super(code, message, 400, fieldErrors);
  }
}

export class BusinessException extends AppException {
  constructor(code: string, message: string) {
    super(code, message, 422);
  }
}

export class ResourceNotFoundException extends AppException {
  constructor(entity: string, id: string) {
    super('RES_NOT_FOUND', `${entity} with id ${id} not found`, 404);
  }
}

export class ResourceAlreadyExistsException extends AppException {
  constructor(entity: string, field: string, value: string) {
    super('RES_ALREADY_EXISTS', `${entity} with ${field} '${value}' already exists`, 409);
  }
}

export class AuthenticationException extends AppException {
  constructor(code: string = 'AUTH_TOKEN_INVALID', message: string = 'Authentication required') {
    super(code, message, 401);
  }
}

export class AuthorizationException extends AppException {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTH_PERMISSION_DENIED', message, 403);
  }
}

export class SystemException extends AppException {
  readonly originalError?: Error;

  constructor(message: string = 'An unexpected error occurred', originalError?: Error) {
    super('SYS_INTERNAL_ERROR', message, 500);
    this.originalError = originalError;
  }
}

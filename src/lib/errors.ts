export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(`Validation error: ${message}`, 400);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(`Database error: ${message}`, 500);
  }
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
  };
}

export function createErrorResponse(
  error: Error | AppError,
  path?: string
): ErrorResponse {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error.message || 'Internal server error';

  return {
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
    },
  };
}

export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

export function logError(error: Error, context?: Record<string, any>) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    // In production, you might want to send this to a logging service
    console.error('Application Error:', JSON.stringify(errorInfo));
  } else {
    console.error('Application Error:', errorInfo);
  }
}

export function handleApiError(error: Error, path?: string): Response {
  logError(error, { path });

  const errorResponse = createErrorResponse(error, path);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
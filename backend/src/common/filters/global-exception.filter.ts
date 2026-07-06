import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  details?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction = process.env.NODE_ENV === 'production';

    let status: number;
    let message: string;
    let error: string;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        error = resp.error || exception.name;
        details = resp.details;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isProduction ? 'Internal server error' : exception.message;
      error = 'InternalServerError';
      
      // Log the full error in development
      if (!isProduction) {
        this.logger.error(exception.message, exception.stack);
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'UnknownError';
    }

    // Add request ID if available
    const requestId = request.headers['x-request-id'] as string;

    // Securely redact sensitive fields from request body for logging
    const redactedBody = { ...request.body };
    if (redactedBody.password) redactedBody.password = '***';
    if (redactedBody.confirmPassword) redactedBody.confirmPassword = '***';

    // Detailed error logging
    const logDetails = {
      requestId: requestId || 'N/A',
      ip: request.ip || request.headers['x-forwarded-for'],
      userAgent: request.headers['user-agent'] || 'Unknown',
      body: redactedBody,
      headers: {
        authorization: request.headers['authorization'] ? 'Present (JWT)' : 'None',
        'x-session-id': request.headers['x-session-id'] || 'None',
      }
    };

    this.logger.error(
      `💥 Error [${requestId || 'N/A'}] ${request.method} ${request.url} - Status ${status} - ${message}\n` +
      `📦 Details: ${JSON.stringify(logDetails, null, 2)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (requestId) {
      errorResponse.requestId = requestId;
    }

    // Add details only in development
    if (!isProduction && details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }
}

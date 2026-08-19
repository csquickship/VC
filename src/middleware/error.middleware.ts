import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Request payload validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle standard errors with custom status codes
  if (err instanceof Error) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode || 500;
    const message = err.message || 'An unexpected internal error occurred';

    log('ERROR', 'ERROR_HANDLER', message, {
      name: err.name,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });

    res.status(statusCode).json({
      error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
      message: statusCode >= 500 && config.nodeEnv === 'production'
        ? 'An unexpected error occurred on the server'
        : message,
    });
    return;
  }

  // Fallback for non-Error thrown types
  log('ERROR', 'ERROR_HANDLER', 'Unknown error caught', { err });
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected internal error occurred',
  });
}

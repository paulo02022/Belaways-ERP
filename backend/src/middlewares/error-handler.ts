import type { ErrorRequestHandler } from 'express';

import { env } from '../config/env.js';
import { isAppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  void _next;
  const requestId = request.requestId;

  if (!isAppError(error)) {
    logger.error({ error, requestId }, 'Unhandled application error');
  }

  const statusCode = isAppError(error) ? error.statusCode : 500;
  const code = isAppError(error) ? error.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError(error)
    ? error.message
    : 'Unexpected error while processing the request.';
  const details = isAppError(error)
    ? error.details
    : {
        message: error instanceof Error ? error.message : String(error),
      };

  response.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId,
      details: !env.isProduction ? details : undefined,
    },
  });
};

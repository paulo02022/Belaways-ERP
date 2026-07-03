import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${request.method} ${request.path} not found.`));
};

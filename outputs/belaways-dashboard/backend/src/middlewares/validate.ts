import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

import { AppError } from '../lib/errors.js';

type RequestSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export const validate =
  (schemas: RequestSchemas) => (request: Request, _response: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        request.body = schemas.body.parse(request.body);
      }

      if (schemas.params) {
        request.params = schemas.params.parse(request.params);
      }

      if (schemas.query) {
        request.query = schemas.query.parse(request.query) as typeof request.query;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload.', error.flatten()),
        );
        return;
      }

      next(error);
    }
  };

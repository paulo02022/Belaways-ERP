import type { NextFunction, Request, Response } from 'express';
import xss from 'xss';

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return xss(value.trim());
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeValue(entry),
      ]),
    );
  }

  return value;
};

export const sanitizeMiddleware = (request: Request, _response: Response, next: NextFunction) => {
  request.body = sanitizeValue(request.body) as typeof request.body;
  Object.assign(request.query, sanitizeValue(request.query));
  Object.assign(request.params, sanitizeValue(request.params));
  next();
};

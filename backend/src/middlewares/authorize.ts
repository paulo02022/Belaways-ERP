import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/errors.js';
import type { UserRole } from '../types/auth.js';

export const authorize =
  (...roles: UserRole[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'User does not have permission for this operation.'));
      return;
    }

    next();
  };

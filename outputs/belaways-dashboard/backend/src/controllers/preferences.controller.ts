import { z } from 'zod';

import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/errors.js';
import { preferencesService } from '../services/supabase/preferences.service.js';

export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  lowStockThreshold: z.number().int().min(0).max(500).optional(),
  favoritePages: z.array(z.string().max(120)).max(20).optional(),
});

export const preferencesController = {
  show: asyncHandler(async (request, response) => {
    if (!request.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }

    sendSuccess(response, await preferencesService.get(request.user.id));
  }),

  update: asyncHandler(async (request, response) => {
    if (!request.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }

    const payload = preferencesSchema.parse(request.body);
    sendSuccess(response, await preferencesService.update(request.user.id, payload));
  }),
};

import { z } from 'zod';

import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { usersService } from '../services/supabase/users.service.js';

export const createUserSchema = z.object({
  email: z.string().email().max(180),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']).default('operator'),
});

export const updateUserSchema = z.object({
  email: z.string().email().max(180).optional(),
  password: z.string().min(8).max(128).optional(),
  fullName: z.string().min(2).max(120).optional(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const userParamsSchema = z.object({
  id: z.string().uuid(),
});

export const usersController = {
  index: asyncHandler(async (_request, response) => {
    sendSuccess(response, await usersService.list());
  }),

  create: asyncHandler(async (request, response) => {
    const payload = createUserSchema.parse(request.body);
    sendSuccess(response, await usersService.create(payload), 'created', undefined, 201);
  }),

  update: asyncHandler(async (request, response) => {
    const { id } = userParamsSchema.parse(request.params);
    const payload = updateUserSchema.parse(request.body);
    sendSuccess(response, await usersService.update(id, payload));
  }),
};

import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { usersService } from '../services/supabase/users.service.js';

export const usersController = {
  index: asyncHandler(async (_request, response) => {
    sendSuccess(response, await usersService.list());
  }),
};

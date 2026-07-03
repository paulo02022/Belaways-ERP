import { asyncHandler } from '../lib/async-handler.js';
import { sendSuccess } from '../api/response.js';

export const healthController = {
  show: asyncHandler(async (_request, response) => {
    sendSuccess(response, {
      service: 'belaways-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }),
};

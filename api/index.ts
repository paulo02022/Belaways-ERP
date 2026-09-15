import type { IncomingMessage, ServerResponse } from 'node:http';

import { createApp } from '../backend/src/app.js';
import { restoreApiRequestUrl } from '../backend/src/utils/vercel-route.js';

const app = createApp();

export default function handler(request: IncomingMessage, response: ServerResponse) {
  request.url = restoreApiRequestUrl(request.url);
  app(request, response);
}

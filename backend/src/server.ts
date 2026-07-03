import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const app = createApp();

app.listen(env.port, () => {
  logger.info({ port: env.port, environment: env.nodeEnv }, 'Belaways API started');
});

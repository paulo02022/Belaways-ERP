import compression from 'compression';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import { pinoHttp } from 'pino-http';

import { corsOptions, rateLimitConfig } from './config/security.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { requestIdMiddleware } from './middlewares/request-id.js';
import { sanitizeMiddleware } from './middlewares/sanitize.js';
import { logger } from './lib/logger.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp<Request, Response>({
      logger,
      customProps: (request) => ({
        requestId: request.requestId,
      }),
    }),
  );
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(rateLimit(rateLimitConfig));
  app.use(hpp());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '500kb' }));
  app.use(sanitizeMiddleware);
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

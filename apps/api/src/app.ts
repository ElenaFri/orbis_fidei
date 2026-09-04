import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import authPlugin from './auth/plugin.js';
import { registerAuthRoutes } from './auth/routes.js';
import { config } from './config.js';
import { registerHealthRoutes } from './health/routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const loggerOptions =
    config.NODE_ENV === 'development'
      ? {
          level: config.API_LOG_LEVEL,
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : { level: config.API_LOG_LEVEL };

  const app: FastifyInstance = Fastify({ logger: loggerOptions });

  await app.register(sensible);
  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: config.API_CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  await app.register(cookie);
  await app.register(authPlugin);

  await app.register(registerHealthRoutes);
  await app.register(registerAuthRoutes);

  return app;
}

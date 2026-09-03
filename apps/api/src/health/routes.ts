import { prisma } from '@orbis-fidei/database';
import type { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';

import { config } from '../config.js';

const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    if (redis.status === 'end' || redis.status === 'wait') {
      await redis.connect();
    }
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    const [db, cache] = await Promise.all([checkDatabase(), checkRedis()]);
    const status = db && cache ? 'ok' : 'degraded';
    return { status, db, redis: cache, uptime: process.uptime() };
  });

  app.get('/', async () => ({
    name: 'Orbis Fidei API',
    version: '0.0.0',
    docs: '/health',
  }));
}

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRootEnv } from '@orbis-fidei/config';
import { QUEUES, createRedisConnection, createWorker } from '@orbis-fidei/queue';
import pino from 'pino';

loadRootEnv(dirname(fileURLToPath(import.meta.url)));

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } },
);

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = createRedisConnection(redisUrl);

const worker = createWorker(
  QUEUES.TRANSLATION,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'translation job received (stub)');
    // Implemented later: title/summary/analysis translation via an AI provider into the target language.
    return { ok: true };
  },
  connection,
);

worker.on('ready', () => logger.info('translator worker ready'));
worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'job failed'));

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down translator');
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

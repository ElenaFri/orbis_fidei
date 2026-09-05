import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRootEnv } from '@orbis-fidei/config';
import { prisma } from '@orbis-fidei/database';
import { QUEUES, createRedisConnection, createWorker } from '@orbis-fidei/queue';
import pino from 'pino';

import { analyzePendingSourceItems, analyzeSourceItem } from './analyzer.js';
import { createAIProvider } from './providers.js';

loadRootEnv(dirname(fileURLToPath(import.meta.url)));

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } },
);

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = createRedisConnection(redisUrl);
const provider = createAIProvider();
const analyzerDependencies = { prisma, provider };

interface AnalysisJobData {
  sourceItemId?: string;
}

const worker = createWorker<AnalysisJobData>(
  QUEUES.ANALYSIS,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'analysis job received');
    if (job.name === 'analyze' && job.data.sourceItemId) {
      return analyzeSourceItem(job.data.sourceItemId, analyzerDependencies);
    }
    return analyzePendingSourceItems(analyzerDependencies);
  },
  connection,
);

worker.on('ready', () => logger.info('analyzer worker ready'));
worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'job failed'));

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down analyzer');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

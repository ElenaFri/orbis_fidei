import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRootEnv } from '@orbis-fidei/config';
import { prisma } from '@orbis-fidei/database';
import { QUEUES, createQueue, createRedisConnection, createWorker } from '@orbis-fidei/queue';
import pino from 'pino';

import { aggregateActiveSources, aggregateSource } from './aggregator.js';

loadRootEnv(dirname(fileURLToPath(import.meta.url)));

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } },
);

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = createRedisConnection(redisUrl);
const analysisQueue = createQueue(QUEUES.ANALYSIS, connection);

const aggregationDependencies = { prisma, analysisQueue };
const pollIntervalMs = Number(process.env.AGGREGATOR_POLL_INTERVAL_MS ?? 15 * 60 * 1000);

interface AggregationJobData {
  sourceId?: string;
}

const worker = createWorker<AggregationJobData>(
  QUEUES.AGGREGATION,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'aggregation job received');
    if (job.name === 'aggregate-source' && typeof job.data?.sourceId === 'string') {
      const source = await prisma.source.findUnique({ where: { id: job.data.sourceId } });
      if (!source) throw new Error(`Source not found: ${job.data.sourceId}`);
      return aggregateSource(source, aggregationDependencies);
    }
    return aggregateActiveSources(aggregationDependencies);
  },
  connection,
);

const runScheduledAggregation = async (): Promise<void> => {
  try {
    const results = await aggregateActiveSources(aggregationDependencies);
    logger.info({ results }, 'scheduled aggregation completed');
  } catch (error) {
    logger.error({ error }, 'scheduled aggregation failed');
  }
};

await runScheduledAggregation();
const pollTimer = setInterval(() => {
  void runScheduledAggregation();
}, pollIntervalMs);

worker.on('ready', () => logger.info('aggregator worker ready'));
worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'job failed'));

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down aggregator');
  clearInterval(pollTimer);
  await worker.close();
  await analysisQueue.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

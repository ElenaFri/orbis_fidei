import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRootEnv } from '@orbis-fidei/config';
import { prisma } from '@orbis-fidei/database';
import { QUEUES, createRedisConnection, createWorker } from '@orbis-fidei/queue';
import pino from 'pino';

import { translateApprovedArticle, translateArticle } from './translator.js';
import { createTranslationProvider } from './providers.js';

loadRootEnv(dirname(fileURLToPath(import.meta.url)));

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } },
);

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = createRedisConnection(redisUrl);
const provider = createTranslationProvider();
const translatorDependencies = { prisma, provider };

interface TranslationJobData {
  articleId?: string;
  sourceLang?: 'FR' | 'EN' | 'RU';
  targetLang?: 'FR' | 'EN' | 'RU';
}

const worker = createWorker<TranslationJobData>(
  QUEUES.TRANSLATION,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'translation job received');
    if (!job.data.articleId || !job.data.sourceLang) {
      throw new Error('Translation job requires articleId and sourceLang');
    }
    if (job.data.targetLang) {
      return translateArticle(
        job.data.articleId,
        job.data.sourceLang,
        job.data.targetLang,
        translatorDependencies,
      );
    }
    return translateApprovedArticle(
      job.data.articleId,
      job.data.sourceLang,
      translatorDependencies,
    );
  },
  connection,
);

worker.on('ready', () => logger.info('translator worker ready'));
worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'job failed'));

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down translator');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

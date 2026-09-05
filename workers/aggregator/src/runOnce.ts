import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRootEnv } from '@orbis-fidei/config';
import { prisma } from '@orbis-fidei/database';
import { QUEUES, createQueue, createRedisConnection } from '@orbis-fidei/queue';

import { aggregateActiveSources } from './aggregator.js';

loadRootEnv(dirname(fileURLToPath(import.meta.url)));

const connection = createRedisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379');
const analysisQueue = createQueue(QUEUES.ANALYSIS, connection);

try {
  const results = await aggregateActiveSources({ prisma, analysisQueue });
  console.log(JSON.stringify(results, null, 2));
} finally {
  await analysisQueue.close();
  await prisma.$disconnect();
}

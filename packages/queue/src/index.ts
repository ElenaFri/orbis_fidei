import { Queue, Worker, type ConnectionOptions, type Processor } from 'bullmq';
import IORedis from 'ioredis';

export const QUEUES = {
    AGGREGATION: 'aggregation',
    ANALYSIS: 'analysis',
    TRANSLATION: 'translation',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export function createRedisConnection(url: string): ConnectionOptions {
    return new IORedis(url, { maxRetriesPerRequest: null });
}

export function createQueue<T = unknown>(name: QueueName, connection: ConnectionOptions): Queue<T> {
    return new Queue<T>(name, { connection });
}

export function createWorker<T = unknown>(
    name: QueueName,
    processor: Processor<T>,
    connection: ConnectionOptions,
): Worker<T> {
    return new Worker<T>(name, processor, { connection });
}

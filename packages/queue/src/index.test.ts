import { describe, expect, it, vi } from 'vitest';

vi.mock('ioredis', () => {
  class MockRedis {
    options: Record<string, unknown>;
    constructor(
      public url: string,
      options: Record<string, unknown>,
    ) {
      this.options = options;
    }
  }
  return { Redis: MockRedis, default: MockRedis };
});

vi.mock('bullmq', () => {
  class MockQueue {
    constructor(
      public name: string,
      public options: Record<string, unknown>,
    ) {}
  }
  class MockWorker {
    constructor(
      public name: string,
      public processor: unknown,
      public options: Record<string, unknown>,
    ) {}
  }
  return { Queue: MockQueue, Worker: MockWorker };
});

const { QUEUES, createRedisConnection, createQueue, createWorker } = await import('./index.js');

describe('queue package', () => {
  it('defines the expected queue names', () => {
    expect(QUEUES.AGGREGATION).toBe('aggregation');
    expect(QUEUES.ANALYSIS).toBe('analysis');
    expect(QUEUES.TRANSLATION).toBe('translation');
  });

  it('creates a Redis connection with maxRetriesPerRequest set to null', () => {
    const connection = createRedisConnection('redis://localhost:6379');
    expect(connection).toBeDefined();
  });

  it('creates a BullMQ Queue instance', () => {
    const connection = createRedisConnection('redis://localhost:6379');
    const queue = createQueue(QUEUES.AGGREGATION, connection);
    expect(queue).toBeDefined();
  });

  it('creates a BullMQ Worker instance', () => {
    const connection = createRedisConnection('redis://localhost:6379');
    const processor = vi.fn();
    const worker = createWorker(QUEUES.ANALYSIS, processor, connection);
    expect(worker).toBeDefined();
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

vi.mock('ioredis', () => {
  class MockRedis {
    status = 'ready';
    connect = vi.fn().mockResolvedValue(undefined);
    ping = vi.fn().mockResolvedValue('PONG');
  }
  return { Redis: MockRedis, default: MockRedis };
});

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789';
process.env.NODE_ENV = 'test';

const { buildApp } = await import('../app.js');

describe('GET /health', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('répond avec le statut de santé', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      db: expect.any(Boolean),
      redis: expect.any(Boolean),
      uptime: expect.any(Number),
    });
  });

  it('retourne db=true et redis=true quand les dépendances répondent', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();
    expect(body.db).toBe(true);
    expect(body.redis).toBe(true);
    expect(body.status).toBe('ok');
  });
});

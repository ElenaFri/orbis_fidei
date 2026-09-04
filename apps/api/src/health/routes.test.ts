import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { mockPing, mockConnect } = vi.hoisted(() => ({
  mockPing: vi.fn().mockResolvedValue('PONG'),
  mockConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

vi.mock('ioredis', () => {
  class MockRedis {
    status = 'ready';
    connect = mockConnect;
    ping = mockPing;
  }
  return { Redis: MockRedis, default: MockRedis };
});

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();

const { buildApp } = await import('../app.js');
const { prisma } = await import('@orbis-fidei/database');

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

  it('retourne un statut dégradé quand la base de données est indisponible', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection refused'));
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();
    expect(body.db).toBe(false);
    expect(body.status).toBe('degraded');
  });

  it('retourne un statut dégradé quand Redis est indisponible', async () => {
    mockPing.mockRejectedValueOnce(new Error('connection refused'));
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();
    expect(body.redis).toBe(false);
    expect(body.status).toBe('degraded');
  });
});

describe('GET /', () => {
  it("renvoie les informations de l'API", async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({ method: 'GET', url: '/' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ name: 'Orbis Fidei API', docs: '/health' });
    } finally {
      await app.close();
    }
  });
});

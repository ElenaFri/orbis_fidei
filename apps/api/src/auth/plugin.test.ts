import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();

const { default: authPlugin, requireAuth, requirePermission } = await import('./plugin.js');
const { signAccessToken } = await import('./tokens.js');

function fakeReply() {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn(() => reply),
  };
  return reply as unknown as import('fastify').FastifyReply;
}

describe('requireAuth', () => {
  afterEach(() => vi.clearAllMocks());

  it("rejette avec 401 quand il n'y a pas d'utilisateur courant", async () => {
    const reply = fakeReply();
    await requireAuth({ currentUser: null } as never, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('ne rejette pas quand un utilisateur est authentifié', async () => {
    const reply = fakeReply();
    await requireAuth(
      { currentUser: { id: '1', email: 'a@b.com', permissions: [] } } as never,
      reply,
    );
    expect(reply.code).not.toHaveBeenCalled();
  });
});

describe('requirePermission', () => {
  afterEach(() => vi.clearAllMocks());

  it("rejette avec 401 quand il n'y a pas d'utilisateur courant", async () => {
    const reply = fakeReply();
    await requirePermission('article.publish')({ currentUser: null } as never, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it("rejette avec 403 quand l'utilisateur n'a pas la permission requise", async () => {
    const reply = fakeReply();
    const request = { currentUser: { id: '1', email: 'a@b.com', permissions: ['article.read'] } };
    await requirePermission('article.publish')(request as never, reply);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it("laisse passer quand l'utilisateur a la permission requise", async () => {
    const reply = fakeReply();
    const request = {
      currentUser: { id: '1', email: 'a@b.com', permissions: ['article.publish'] },
    };
    await requirePermission('article.publish')(request as never, reply);
    expect(reply.code).not.toHaveBeenCalled();
  });
});

describe('authPlugin (onRequest hook)', () => {
  async function buildTestApp() {
    const app = Fastify();
    await app.register(authPlugin);
    app.get('/whoami', async (request) => ({ currentUser: request.currentUser }));
    return app;
  }

  it("laisse currentUser à null quand il n'y a pas d'en-tête Authorization", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/whoami' });
    expect(response.json().currentUser).toBeNull();
  });

  it("laisse currentUser à null quand l'en-tête n'est pas au format Bearer", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: 'Basic abc123' },
    });
    expect(response.json().currentUser).toBeNull();
  });

  it('laisse currentUser à null quand le token est invalide', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: 'Bearer not-a-valid-token' },
    });
    expect(response.json().currentUser).toBeNull();
  });

  it('peuple currentUser avec un token valide', async () => {
    const app = await buildTestApp();
    const token = signAccessToken({
      sub: 'user_1',
      email: 'a@b.com',
      permissions: ['article.read'],
    });
    const response = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.json().currentUser).toMatchObject({ id: 'user_1', email: 'a@b.com' });
  });
});

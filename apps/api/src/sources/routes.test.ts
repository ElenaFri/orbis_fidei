import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAdminTestApp, tokenWith } from '../test-utils/testApp.js';

interface FakeSource {
  id: string;
  name: string;
  url: string;
  language: string;
  type: string;
  fetchIntervalMin: number;
  status: string;
}

const sources = new Map<string, FakeSource>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    source: {
      findMany: vi.fn(async () => [...sources.values()]),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; url?: string } }) => {
        if (where.id) return sources.get(where.id) ?? null;
        if (where.url) return [...sources.values()].find((s) => s.url === where.url) ?? null;
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<FakeSource, 'id'> }) => {
        const source: FakeSource = { id: `source_${nextId++}`, ...data };
        sources.set(source.id, source);
        return source;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeSource> }) => {
          const source = sources.get(where.id);
          if (!source) throw new Error('not found');
          Object.assign(source, data);
          return source;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        sources.delete(where.id);
      }),
    },
  },
}));

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();
const { registerSourceRoutes } = await import('./routes.js');

function buildTestApp() {
  return buildAdminTestApp(registerSourceRoutes);
}

describe('source routes', () => {
  afterEach(() => sources.clear());

  it('rejette avec 401 sans authentification', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/admin/sources' });
    expect(response.statusCode).toBe(401);
  });

  it("rejette avec 403 sans la permission 'source.manage'", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin/sources',
      headers: { authorization: `Bearer ${await tokenWith([])}` },
    });
    expect(response.statusCode).toBe(403);
  });

  it('crée puis liste une source avec la permission requise', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['source.manage'])}` };

    const created = await app.inject({
      method: 'POST',
      url: '/admin/sources',
      headers: auth,
      payload: { name: 'KTO', url: 'https://kto.com/rss', language: 'FR', type: 'RSS' },
    });
    expect(created.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/admin/sources', headers: auth });
    expect(list.json()).toHaveLength(1);
  });

  it('refuse une création avec un corps invalide', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/sources',
      headers: { authorization: `Bearer ${await tokenWith(['source.manage'])}` },
      payload: { name: 'KTO' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('modifie puis supprime une source', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['source.manage'])}` };

    const created = await app.inject({
      method: 'POST',
      url: '/admin/sources',
      headers: auth,
      payload: { name: 'KTO', url: 'https://kto.com/rss', language: 'FR', type: 'RSS' },
    });
    const { id } = created.json();

    const updated = await app.inject({
      method: 'PATCH',
      url: `/admin/sources/${id}`,
      headers: auth,
      payload: { name: 'KTO TV' },
    });
    expect(updated.json().name).toBe('KTO TV');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/admin/sources/${id}`,
      headers: auth,
    });
    expect(deleted.statusCode).toBe(204);

    const getAfterDelete = await app.inject({
      method: 'GET',
      url: `/admin/sources/${id}`,
      headers: auth,
    });
    expect(getAfterDelete.statusCode).toBe(404);
  });

  it('renvoie 404 pour une source introuvable (get/patch/delete)', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['source.manage'])}` };

    const get = await app.inject({ method: 'GET', url: '/admin/sources/unknown', headers: auth });
    expect(get.statusCode).toBe(404);

    const patch = await app.inject({
      method: 'PATCH',
      url: '/admin/sources/unknown',
      headers: auth,
      payload: { name: 'Nouveau nom' },
    });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({
      method: 'DELETE',
      url: '/admin/sources/unknown',
      headers: auth,
    });
    expect(del.statusCode).toBe(404);
  });

  it('refuse une modification avec un corps invalide', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['source.manage'])}` };

    const created = await app.inject({
      method: 'POST',
      url: '/admin/sources',
      headers: auth,
      payload: { name: 'KTO', url: 'https://kto.com/rss', language: 'FR', type: 'RSS' },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/sources/${id}`,
      headers: auth,
      payload: { type: 'INVALID_TYPE' },
    });
    expect(response.statusCode).toBe(400);
  });
});

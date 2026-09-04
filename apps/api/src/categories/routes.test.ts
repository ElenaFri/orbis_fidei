import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAdminTestApp, tokenWith } from '../test-utils/testApp.js';

interface FakeCategory {
  id: string;
  key: string;
  labelFr: string;
  labelEn: string;
  labelRu: string;
}

const categories = new Map<string, FakeCategory>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    category: {
      findMany: vi.fn(async () => [...categories.values()]),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; key?: string } }) => {
        if (where.id) return categories.get(where.id) ?? null;
        if (where.key) return [...categories.values()].find((c) => c.key === where.key) ?? null;
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<FakeCategory, 'id'> }) => {
        const category: FakeCategory = { id: `category_${nextId++}`, ...data };
        categories.set(category.id, category);
        return category;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeCategory> }) => {
          const category = categories.get(where.id);
          if (!category) throw new Error('not found');
          Object.assign(category, data);
          return category;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        categories.delete(where.id);
      }),
    },
  },
}));

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();
const { registerCategoryRoutes } = await import('./routes.js');

function buildTestApp() {
  return buildAdminTestApp(registerCategoryRoutes);
}

describe('category routes', () => {
  afterEach(() => categories.clear());

  it('rejette avec 401 sans authentification', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/admin/categories' });
    expect(response.statusCode).toBe(401);
  });

  it("rejette avec 403 sans la permission 'category.manage'", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin/categories',
      headers: { authorization: `Bearer ${await tokenWith([])}` },
    });
    expect(response.statusCode).toBe(403);
  });

  it('crée puis liste une catégorie avec la permission requise', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['category.manage'])}` };

    const created = await app.inject({
      method: 'POST',
      url: '/admin/categories',
      headers: auth,
      payload: {
        key: 'theology',
        labelFr: 'Théologie',
        labelEn: 'Theology',
        labelRu: 'Богословие',
      },
    });
    expect(created.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/admin/categories', headers: auth });
    expect(list.json()).toHaveLength(1);
  });

  it('refuse une création avec un corps invalide', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/categories',
      headers: { authorization: `Bearer ${await tokenWith(['category.manage'])}` },
      payload: { key: 'Invalid Key' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('modifie puis supprime une catégorie', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['category.manage'])}` };

    const created = await app.inject({
      method: 'POST',
      url: '/admin/categories',
      headers: auth,
      payload: {
        key: 'theology',
        labelFr: 'Théologie',
        labelEn: 'Theology',
        labelRu: 'Богословие',
      },
    });
    const { id } = created.json();

    const updated = await app.inject({
      method: 'PATCH',
      url: `/admin/categories/${id}`,
      headers: auth,
      payload: { labelFr: 'Nouveau libellé' },
    });
    expect(updated.json().labelFr).toBe('Nouveau libellé');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/admin/categories/${id}`,
      headers: auth,
    });
    expect(deleted.statusCode).toBe(204);
  });

  it('renvoie 404 pour une catégorie introuvable (get/patch/delete)', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['category.manage'])}` };

    const get = await app.inject({
      method: 'GET',
      url: '/admin/categories/unknown',
      headers: auth,
    });
    expect(get.statusCode).toBe(404);

    const patch = await app.inject({
      method: 'PATCH',
      url: '/admin/categories/unknown',
      headers: auth,
      payload: { labelFr: 'Nouveau libellé' },
    });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({
      method: 'DELETE',
      url: '/admin/categories/unknown',
      headers: auth,
    });
    expect(del.statusCode).toBe(404);
  });

  it('refuse une modification avec un corps invalide', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['category.manage'])}` };

    const created = await app.inject({
      method: 'POST',
      url: '/admin/categories',
      headers: auth,
      payload: {
        key: 'theology',
        labelFr: 'Théologie',
        labelEn: 'Theology',
        labelRu: 'Богословие',
      },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/categories/${id}`,
      headers: auth,
      payload: { key: 'Invalid Key' },
    });
    expect(response.statusCode).toBe(400);
  });
});

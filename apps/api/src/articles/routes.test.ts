import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAdminTestApp, tokenWith } from '../test-utils/testApp.js';

interface FakeArticle {
  id: string;
  slug: string;
  status: string;
  sourceId: string | null;
  authorId: string | null;
  originalLang: string;
}

const articles = new Map<string, FakeArticle>();
const translations: { id: string; articleId: string; language: string }[] = [];
let nextId = 1;

function withRelations(article: FakeArticle) {
  return {
    ...article,
    translations: translations.filter((t) => t.articleId === article.id),
    categories: [] as unknown[],
  };
}

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    article: {
      findMany: vi.fn(async () => [...articles.values()].map(withRelations)),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; slug?: string } }) => {
        const article = where.id
          ? articles.get(where.id)
          : [...articles.values()].find((a) => a.slug === where.slug);
        return article ? withRelations(article) : null;
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            slug: string;
            originalLang: string;
            sourceId?: string;
            authorId: string;
            translations: { create: { language: string }[] };
            categories: { create: unknown[] };
          };
        }) => {
          const id = `article_${nextId++}`;
          const article: FakeArticle = {
            id,
            slug: data.slug,
            status: 'DRAFT',
            sourceId: data.sourceId ?? null,
            authorId: data.authorId,
            originalLang: data.originalLang,
          };
          articles.set(id, article);
          for (const t of data.translations.create) {
            translations.push({
              id: `translation_${nextId++}`,
              articleId: id,
              language: t.language,
            });
          }
          return withRelations(article);
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status: string; publishedAt: Date };
        }) => {
          const article = articles.get(where.id);
          if (!article) throw new Error('not found');
          Object.assign(article, data);
          return withRelations(article);
        },
      ),
    },
    articleTranslation: { upsert: vi.fn() },
    articleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();
const { registerArticleRoutes } = await import('./routes.js');

function buildTestApp() {
  return buildAdminTestApp(registerArticleRoutes);
}

const validTranslation = {
  language: 'FR',
  title: 'Titre suffisant',
  summary: 'Résumé suffisamment long pour passer la validation.',
  analysis: 'Analyse suffisamment longue pour passer la validation.',
};

describe('article routes', () => {
  afterEach(() => {
    articles.clear();
    translations.length = 0;
  });

  it("rejette la création avec 403 sans la permission 'article.create'", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: { authorization: `Bearer ${await tokenWith([])}` },
      payload: { slug: 'test', originalLang: 'FR', translations: [validTranslation] },
    });
    expect(response.statusCode).toBe(403);
  });

  it('crée puis liste un article avec la permission requise', async () => {
    const app = await buildTestApp();
    const auth = { authorization: `Bearer ${await tokenWith(['article.create', 'article.read'])}` };

    const created = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: auth,
      payload: { slug: 'mon-article', originalLang: 'FR', translations: [validTranslation] },
    });
    expect(created.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/admin/articles', headers: auth });
    expect(list.json()).toHaveLength(1);
  });

  it('refuse une création sans traduction', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: { authorization: `Bearer ${await tokenWith(['article.create'])}` },
      payload: { slug: 'mon-article', originalLang: 'FR', translations: [] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejette la modification avec 403 sans la permission 'article.edit'", async () => {
    const app = await buildTestApp();
    const createAuth = { authorization: `Bearer ${await tokenWith(['article.create'])}` };
    const created = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: createAuth,
      payload: { slug: 'mon-article', originalLang: 'FR', translations: [validTranslation] },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/articles/${id}`,
      headers: { authorization: `Bearer ${await tokenWith([])}` },
      payload: { categoryIds: [] },
    });
    expect(response.statusCode).toBe(403);
  });

  it('renvoie 404 pour un article introuvable', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin/articles/unknown',
      headers: { authorization: `Bearer ${await tokenWith(['article.read'])}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('renvoie 404 pour une modification sur un article introuvable', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/articles/unknown',
      headers: { authorization: `Bearer ${await tokenWith(['article.edit'])}` },
      payload: { categoryIds: [] },
    });
    expect(response.statusCode).toBe(404);
  });

  it('refuse une modification avec un corps invalide', async () => {
    const app = await buildTestApp();
    const createAuth = { authorization: `Bearer ${await tokenWith(['article.create'])}` };
    const created = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: createAuth,
      payload: { slug: 'mon-article', originalLang: 'FR', translations: [validTranslation] },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/articles/${id}`,
      headers: { authorization: `Bearer ${await tokenWith(['article.edit'])}` },
      payload: { translations: [{ language: 'INVALID' }] },
    });
    expect(response.statusCode).toBe(400);
  });

  it('récupère et modifie un article existant avec les permissions requises', async () => {
    const app = await buildTestApp();
    const createAuth = { authorization: `Bearer ${await tokenWith(['article.create'])}` };
    const created = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: createAuth,
      payload: { slug: 'mon-article', originalLang: 'FR', translations: [validTranslation] },
    });
    const { id } = created.json();

    const getResponse = await app.inject({
      method: 'GET',
      url: `/admin/articles/${id}`,
      headers: { authorization: `Bearer ${await tokenWith(['article.read'])}` },
    });
    expect(getResponse.statusCode).toBe(200);

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/admin/articles/${id}`,
      headers: { authorization: `Bearer ${await tokenWith(['article.edit'])}` },
      payload: { categoryIds: [] },
    });
    expect(patchResponse.statusCode).toBe(200);
  });

  it("rejette la publication avec 403 sans la permission 'article.publish'", async () => {
    const app = await buildTestApp();
    const created = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: { authorization: `Bearer ${await tokenWith(['article.create'])}` },
      payload: { slug: 'mon-article', originalLang: 'FR', translations: [validTranslation] },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: 'POST',
      url: `/admin/articles/${id}/publish`,
      headers: { authorization: `Bearer ${await tokenWith([])}` },
    });
    expect(response.statusCode).toBe(403);
  });

  it('publishes an article with the required permission', async () => {
    const app = await buildTestApp();
    const created = await app.inject({
      method: 'POST',
      url: '/admin/articles',
      headers: { authorization: `Bearer ${await tokenWith(['article.create'])}` },
      payload: { slug: 'mon-article', originalLang: 'FR', translations: [validTranslation] },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: 'POST',
      url: `/admin/articles/${id}/publish`,
      headers: { authorization: `Bearer ${await tokenWith(['article.publish'])}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('PUBLISHED');
  });

  it('returns 404 when publishing an unknown article', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/articles/unknown/publish',
      headers: { authorization: `Bearer ${await tokenWith(['article.publish'])}` },
    });
    expect(response.statusCode).toBe(404);
  });
});

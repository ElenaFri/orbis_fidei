import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeArticle {
  id: string;
  slug: string;
  status: string;
  originalLang: string;
  publishedAt: Date | null;
}

interface FakeTranslation {
  articleId: string;
  language: string;
  title: string;
  summary: string;
  analysis: string;
}

const articles = new Map<string, FakeArticle>();
const translations: FakeTranslation[] = [];
let nextId = 1;

function matches(article: FakeArticle, lang: string): boolean {
  return (
    article.status === 'PUBLISHED' &&
    translations.some((t) => t.articleId === article.id && t.language === lang)
  );
}

function withRelations(article: FakeArticle, lang: string) {
  return {
    ...article,
    translations: translations.filter((t) => t.articleId === article.id && t.language === lang),
    categories: [] as {
      category: { id: string; key: string; labelFr: string; labelEn: string; labelRu: string };
    }[],
    source: { name: 'Vatican News', url: 'https://vaticannews.va/fr.rss.xml' },
    proposal: {
      sourceItem: {
        originalUrl: 'https://vaticannews.va/fr/pape/news/2026-09/actualite.html',
      },
    },
    _count: { comments: 0 },
  };
}

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    article: {
      findMany: vi.fn(
        async ({
          where: _where,
          select,
        }: {
          where: { translations: { some: { language: string } } };
          select: { translations: { where: { language: string } } };
        }) => {
          const lang = select.translations.where.language;
          return [...articles.values()]
            .filter((a) => matches(a, lang))
            .map((a) => withRelations(a, lang));
        },
      ),
      count: vi.fn(
        async ({ where }: { where: { translations: { some: { language: string } } } }) => {
          const lang = where.translations.some.language;
          return [...articles.values()].filter((a) => matches(a, lang)).length;
        },
      ),
      findFirst: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { slug: string; translations: { some: { language: string } } };
          select: { translations: { where: { language: string } } };
        }) => {
          const lang = select.translations.where.language;
          const article = [...articles.values()].find(
            (a) => a.slug === where.slug && matches(a, lang),
          );
          return article ? withRelations(article, lang) : null;
        },
      ),
    },
  },
}));

const { registerPublicArticleRoutes } = await import('./publicRoutes.js');

function seedPublished(overrides: Partial<FakeArticle & { title: string }> = {}) {
  const id = `article_${nextId++}`;
  const article: FakeArticle = {
    id,
    slug: overrides.slug ?? `article-${nextId}`,
    status: 'PUBLISHED',
    originalLang: 'FR',
    publishedAt: new Date(),
    ...overrides,
  };
  articles.set(id, article);
  translations.push({
    articleId: id,
    language: 'FR',
    title: overrides.title ?? 'Titre publié',
    summary: 'Résumé.',
    analysis: 'Analyse.',
  });
  return article;
}

async function buildTestApp() {
  const app = Fastify();
  await app.register(registerPublicArticleRoutes);
  return app;
}

describe('public article routes', () => {
  afterEach(() => {
    articles.clear();
    translations.length = 0;
  });

  it('lists published articles for the requested language', async () => {
    seedPublished({ slug: 'mon-article', title: 'Mon article' });
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/articles?lang=FR' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('Mon article');
    expect(body.total).toBe(1);
  });

  it('defaults to French and page 1 when no query params are given', async () => {
    seedPublished();
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/articles' });
    expect(response.statusCode).toBe(200);
    expect(response.json().page).toBe(1);
  });

  it('rejects an invalid language', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/articles?lang=XX' });
    expect(response.statusCode).toBe(400);
  });

  it('returns a published article by slug', async () => {
    seedPublished({ slug: 'mon-article', title: 'Mon article' });
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/articles/mon-article?lang=FR' });
    expect(response.statusCode).toBe(200);
    expect(response.json().title).toBe('Mon article');
    expect(response.json().analysis).toBe('Analyse.');
    expect(response.json().sourceUrl).toBe(
      'https://vaticannews.va/fr/pape/news/2026-09/actualite.html',
    );
  });

  it('returns 404 for an unknown or unpublished slug', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/articles/unknown?lang=FR' });
    expect(response.statusCode).toBe(404);
  });

  it('rejects an invalid page query parameter', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/articles?page=0' });
    expect(response.statusCode).toBe(400);
  });

  it('rejects an invalid language in detail query', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/articles/mon-article?lang=INVALID' });
    expect(response.statusCode).toBe(400);
  });
});

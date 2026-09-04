import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeArticle {
  id: string;
  slug: string;
  status: string;
  sourceId: string | null;
  authorId: string | null;
  originalLang: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeTranslation {
  id: string;
  articleId: string;
  language: string;
  title: string;
  summary: string;
  analysis: string;
}

const articles = new Map<string, FakeArticle>();
const translations: FakeTranslation[] = [];
const articleCategories: { articleId: string; categoryId: string }[] = [];
let nextId = 1;

function withRelations(article: FakeArticle) {
  return {
    ...article,
    translations: translations.filter((t) => t.articleId === article.id),
    categories: articleCategories
      .filter((c) => c.articleId === article.id)
      .map((c) => ({
        articleId: c.articleId,
        categoryId: c.categoryId,
        category: { id: c.categoryId },
      })),
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
            translations: { create: Omit<FakeTranslation, 'id' | 'articleId'>[] };
            categories: { create: { categoryId: string }[] };
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
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          articles.set(id, article);
          for (const t of data.translations.create) {
            translations.push({ id: `translation_${nextId++}`, articleId: id, ...t });
          }
          for (const c of data.categories.create) {
            articleCategories.push({ articleId: id, categoryId: c.categoryId });
          }
          return withRelations(article);
        },
      ),
    },
    articleTranslation: {
      upsert: vi.fn(
        async ({
          where,
          update,
          create,
        }: {
          where: { articleId_language: { articleId: string; language: string } };
          update: Partial<FakeTranslation>;
          create: Omit<FakeTranslation, 'id'>;
        }) => {
          const existing = translations.find(
            (t) =>
              t.articleId === where.articleId_language.articleId &&
              t.language === where.articleId_language.language,
          );
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const created: FakeTranslation = { id: `translation_${nextId++}`, ...create };
          translations.push(created);
          return created;
        },
      ),
    },
    articleCategory: {
      deleteMany: vi.fn(async ({ where }: { where: { articleId: string } }) => {
        const remaining = articleCategories.filter((c) => c.articleId !== where.articleId);
        articleCategories.length = 0;
        articleCategories.push(...remaining);
      }),
      createMany: vi.fn(async ({ data }: { data: { articleId: string; categoryId: string }[] }) => {
        articleCategories.push(...data);
      }),
    },
  },
}));

const service = await import('./service.js');

const baseTranslation = {
  language: 'FR' as const,
  title: 'Titre suffisant',
  summary: 'Résumé suffisamment long pour passer la validation.',
  analysis: 'Analyse suffisamment longue pour passer la validation.',
};

describe('articles service', () => {
  afterEach(() => {
    articles.clear();
    translations.length = 0;
    articleCategories.length = 0;
  });

  it('crée un article avec au moins une traduction', async () => {
    const created = await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    expect(created.slug).toBe('mon-article');
    expect(created.translations).toHaveLength(1);
    expect(created.status).toBe('DRAFT');
  });

  it('refuse de créer un article avec un slug déjà utilisé', async () => {
    await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    await expect(
      service.createArticle(
        {
          slug: 'mon-article',
          originalLang: 'FR',
          categoryIds: [],
          translations: [baseTranslation],
        },
        'user_1',
      ),
    ).rejects.toThrow(service.ArticleError);
  });

  it('lève une erreur 404 pour un article introuvable', async () => {
    await expect(service.getArticle('unknown')).rejects.toThrow(service.ArticleError);
  });

  it('liste les articles avec leurs traductions', async () => {
    await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    const list = await service.listArticles();
    expect(list).toHaveLength(1);
    expect(list[0]?.translations).toHaveLength(1);
  });

  it('met à jour une traduction existante et en ajoute une nouvelle', async () => {
    const created = await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );

    const updated = await service.updateArticle(created.id, {
      translations: [
        { ...baseTranslation, title: 'Titre modifié' },
        {
          language: 'EN',
          title: 'Sufficient title',
          summary: 'A summary long enough to pass validation checks.',
          analysis: 'An analysis long enough to pass validation checks.',
        },
      ],
    });

    expect(updated.translations).toHaveLength(2);
    expect(updated.translations.find((t) => t.language === 'FR')?.title).toBe('Titre modifié');
  });

  it('remplace les catégories associées', async () => {
    const created = await service.createArticle(
      {
        slug: 'mon-article',
        originalLang: 'FR',
        categoryIds: ['cat_1'],
        translations: [baseTranslation],
      },
      'user_1',
    );
    expect(created.categories).toHaveLength(1);

    const updated = await service.updateArticle(created.id, { categoryIds: ['cat_2', 'cat_3'] });
    expect(updated.categories.map((c) => c.categoryId).sort()).toEqual(['cat_2', 'cat_3']);
  });
});

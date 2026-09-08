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

function withRelations(article: FakeArticle, translationLang?: string) {
  return {
    ...article,
    translations: translations.filter(
      (t) => t.articleId === article.id && (!translationLang || t.language === translationLang),
    ),
    categories: articleCategories
      .filter((c) => c.articleId === article.id)
      .map((c) => ({
        articleId: c.articleId,
        categoryId: c.categoryId,
        category: { id: c.categoryId },
      })),
    source: null,
    proposal: null,
    _count: { comments: 0 },
  };
}

function matchesPublicWhere(article: FakeArticle, lang: string): boolean {
  if (article.status !== 'PUBLISHED') return false;
  return translations.some((t) => t.articleId === article.id && t.language === lang);
}

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    article: {
      findMany: vi.fn(
        async ({
          where,
          include,
        }: {
          where?: { status?: string; translations?: { some: { language: string } } };
          include?: { translations?: { where?: { language?: string } } };
        } = {}) => {
          const lang = include?.translations?.where?.language;
          let list = [...articles.values()];
          if (where?.status === 'PUBLISHED' && where.translations) {
            list = list.filter((a) => matchesPublicWhere(a, where.translations!.some.language));
          }
          return list.map((a) => withRelations(a, lang));
        },
      ),
      findFirst: vi.fn(
        async ({
          where,
          include,
        }: {
          where: { slug: string; status: string; translations: { some: { language: string } } };
          include?: { translations?: { where?: { language?: string } } };
        }) => {
          const article = [...articles.values()].find(
            (a) => a.slug === where.slug && matchesPublicWhere(a, where.translations.some.language),
          );
          const lang = include?.translations?.where?.language;
          return article ? withRelations(article, lang) : null;
        },
      ),
      count: vi.fn(
        async ({
          where,
        }: {
          where?: { status?: string; translations?: { some: { language: string } } };
        } = {}) => {
          let list = [...articles.values()];
          if (where?.status === 'PUBLISHED' && where.translations) {
            list = list.filter((a) => matchesPublicWhere(a, where.translations!.some.language));
          }
          return list.length;
        },
      ),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; slug?: string } }) => {
        const article = where.id
          ? articles.get(where.id)
          : [...articles.values()].find((a) => a.slug === where.slug);
        return article ? withRelations(article) : null;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeArticle> }) => {
          const article = articles.get(where.id);
          if (!article) throw new Error('not found');
          Object.assign(article, data);
          return withRelations(article);
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        articles.delete(where.id);
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
    editorialAction: { create: vi.fn(async () => undefined) },
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

  it('met à jour le slug dun article avec succès', async () => {
    const created = await service.createArticle(
      {
        slug: 'mon-article',
        originalLang: 'FR',
        categoryIds: [],
        translations: [baseTranslation],
      },
      'user_1',
    );
    const updated = await service.updateArticle(created.id, { slug: 'nouveau-slug-valide' });
    expect(updated.slug).toBe('nouveau-slug-valide');
  });

  it('refuse de modifier le slug vers un slug déjà existant', async () => {
    await service.createArticle(
      {
        slug: 'premier-article',
        originalLang: 'FR',
        categoryIds: [],
        translations: [baseTranslation],
      },
      'user_1',
    );
    const second = await service.createArticle(
      {
        slug: 'second-article',
        originalLang: 'FR',
        categoryIds: [],
        translations: [baseTranslation],
      },
      'user_1',
    );

    await expect(service.updateArticle(second.id, { slug: 'premier-article' })).rejects.toThrow(
      service.ArticleError,
    );
  });
});

describe('publishArticle', () => {
  afterEach(() => {
    articles.clear();
    translations.length = 0;
    articleCategories.length = 0;
  });

  it('marks an article as published', async () => {
    const created = await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    expect(created.status).toBe('DRAFT');

    const published = await service.publishArticle(created.id);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeInstanceOf(Date);
  });

  it('throws a 404 error when publishing an unknown article', async () => {
    await expect(service.publishArticle('unknown')).rejects.toThrow(service.ArticleError);
  });
});

describe('deleteArticle', () => {
  afterEach(() => {
    articles.clear();
    translations.length = 0;
    articleCategories.length = 0;
  });

  it('deletes a draft article', async () => {
    const created = await service.createArticle(
      { slug: 'draft', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    await service.deleteArticle(created.id);
    await expect(service.getArticle(created.id)).rejects.toThrow(service.ArticleError);
  });

  it('deletes published articles when requested by an authorized editor', async () => {
    const created = await service.createArticle(
      { slug: 'published', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    await service.publishArticle(created.id);
    await expect(service.deleteArticle(created.id)).resolves.toBeUndefined();
  });
});

describe('listPublicArticles', () => {
  afterEach(() => {
    articles.clear();
    translations.length = 0;
    articleCategories.length = 0;
  });

  it('only returns published articles with a translation in the requested language', async () => {
    const draft = await service.createArticle(
      { slug: 'brouillon', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    const published = await service.createArticle(
      { slug: 'publie', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    await service.publishArticle(published.id);
    void draft;

    const result = await service.listPublicArticles({ lang: 'FR' });
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.slug).toBe('publie');
    expect(result.total).toBe(1);
  });

  it('excludes published articles without a translation in the requested language', async () => {
    const created = await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    await service.publishArticle(created.id);

    const result = await service.listPublicArticles({ lang: 'EN' });
    expect(result.articles).toHaveLength(0);
  });
});

describe('getPublicArticleBySlug', () => {
  afterEach(() => {
    articles.clear();
    translations.length = 0;
    articleCategories.length = 0;
  });

  it('returns a published article by slug with the requested translation', async () => {
    const created = await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    await service.publishArticle(created.id);

    const article = await service.getPublicArticleBySlug('mon-article', 'FR');
    expect(article.translations).toHaveLength(1);
    expect(article.translations[0]?.title).toBe(baseTranslation.title);
  });

  it('throws a 404 error for a draft article', async () => {
    const created = await service.createArticle(
      { slug: 'mon-article', originalLang: 'FR', categoryIds: [], translations: [baseTranslation] },
      'user_1',
    );
    void created;

    await expect(service.getPublicArticleBySlug('mon-article', 'FR')).rejects.toThrow(
      service.ArticleError,
    );
  });

  it('throws a 404 error for an unknown slug', async () => {
    await expect(service.getPublicArticleBySlug('unknown', 'FR')).rejects.toThrow(
      service.ArticleError,
    );
  });
});

import { prisma } from '@orbis-fidei/database';
import type { ArticleCreateInput, ArticleUpdateInput, Language } from '@orbis-fidei/validation';

export class ArticleError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ArticleError';
  }
}

const ARTICLE_INCLUDE = {
  translations: true,
  categories: { include: { category: true } },
  source: true,
  proposal: {
    include: {
      sourceItem: true,
    },
  },
} as const;

export function listArticles() {
  return prisma.article.findMany({ include: ARTICLE_INCLUDE, orderBy: { createdAt: 'desc' } });
}

export async function getArticle(id: string) {
  const article = await prisma.article.findUnique({ where: { id }, include: ARTICLE_INCLUDE });
  if (!article) throw new ArticleError('Article introuvable.', 404);
  return article;
}

export async function createArticle(input: ArticleCreateInput, authorId: string) {
  const existing = await prisma.article.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ArticleError('Un article avec ce slug existe déjà.', 409);

  return prisma.article.create({
    data: {
      slug: input.slug,
      originalLang: input.originalLang,
      sourceId: input.sourceId,
      authorId,
      translations: { create: input.translations },
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
    include: ARTICLE_INCLUDE,
  });
}

export async function updateArticle(id: string, input: ArticleUpdateInput) {
  const current = await getArticle(id);

  if (input.slug && input.slug !== current.slug) {
    const existing = await prisma.article.findUnique({ where: { slug: input.slug } });
    if (existing && existing.id !== id) {
      throw new ArticleError('Un article avec ce slug existe déjà.', 409);
    }
    await prisma.article.update({
      where: { id },
      data: { slug: input.slug },
    });
  }

  if (input.translations) {
    for (const translation of input.translations) {
      await prisma.articleTranslation.upsert({
        where: { articleId_language: { articleId: id, language: translation.language } },
        update: translation,
        create: { ...translation, articleId: id },
      });
    }
  }

  if (input.categoryIds) {
    await prisma.articleCategory.deleteMany({ where: { articleId: id } });
    await prisma.articleCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({ articleId: id, categoryId })),
    });
  }

  return getArticle(id);
}
/** Minimal editorial transition: marks the article as published. No full workflow yet (see Phase 2.4/8). */
export async function publishArticle(id: string) {
  await getArticle(id);
  return prisma.article.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
    include: ARTICLE_INCLUDE,
  });
}

export async function deleteArticle(id: string): Promise<void> {
  await getArticle(id);
  await prisma.article.delete({ where: { id } });
}

const PUBLIC_PAGE_SIZE = 20;

export interface PublicArticleListParams {
  lang: Language;
  page?: number;
}

/** Lists published articles that have a translation in the requested language. */
export async function listPublicArticles({ lang, page = 1 }: PublicArticleListParams) {
  const where = { status: 'PUBLISHED' as const, translations: { some: { language: lang } } };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        translations: { where: { language: lang } },
        categories: { include: { category: true } },
        source: true,
        _count: { select: { comments: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
    }),
    prisma.article.count({ where }),
  ]);

  return { articles, total, page, pageSize: PUBLIC_PAGE_SIZE };
}

/** Gets a single published article by slug, with its translation in the requested language. */
export async function getPublicArticleBySlug(slug: string, lang: Language) {
  const article = await prisma.article.findFirst({
    where: { slug, status: 'PUBLISHED', translations: { some: { language: lang } } },
    include: {
      translations: { where: { language: lang } },
      categories: { include: { category: true } },
      source: true,
      proposal: {
        include: {
          sourceItem: true,
        },
      },
      _count: { select: { comments: true } },
    },
  });
  if (!article) throw new ArticleError('Article introuvable.', 404);
  return article;
}

import { prisma } from '@orbis-fidei/database';
import type { ArticleCreateInput, ArticleUpdateInput } from '@orbis-fidei/validation';

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
  await getArticle(id);

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

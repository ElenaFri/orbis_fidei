import { LanguageSchema } from '@orbis-fidei/validation';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import * as articleService from './service.js';

const ListQuerySchema = z.object({
  lang: LanguageSchema.default('FR'),
  page: z.coerce.number().int().positive().default(1),
  query: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  sourceId: z.string().cuid().optional(),
});

const DetailQuerySchema = z.object({
  lang: LanguageSchema.default('FR'),
});
const PUBLIC_LIST_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';
const PUBLIC_DETAIL_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=900';

function toSummary(
  article: Awaited<ReturnType<typeof articleService.listPublicArticles>>['articles'][number],
) {
  const translation = article.translations[0];
  return {
    id: article.id,
    slug: article.slug,
    title: translation?.title ?? '',
    summary: translation?.summary ?? '',
    language: translation?.language ?? article.originalLang,
    publishedAt: article.publishedAt,
    sourceName: article.source?.name,
    categoryKeys: article.categories.map((c) => c.category.key),
    categories: article.categories.map((c) => ({
      id: c.category.id,
      key: c.category.key,
      labelFr: c.category.labelFr,
      labelEn: c.category.labelEn,
      labelRu: c.category.labelRu,
    })),
    commentCount: article._count.comments,
  };
}

export async function registerPublicArticleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/articles', async (request, reply) => {
    const parsed = ListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    const { articles, total, page, pageSize } = await articleService.listPublicArticles(
      parsed.data,
    );
    reply.header('Cache-Control', PUBLIC_LIST_CACHE_CONTROL);
    return { items: articles.map(toSummary), total, page, pageSize };
  });

  app.get<{ Params: { slug: string } }>('/articles/:slug', async (request, reply) => {
    const parsed = DetailQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    try {
      const article = await articleService.getPublicArticleBySlug(
        request.params.slug,
        parsed.data.lang,
      );
      const translation = article.translations[0];
      const sourceUrl = article.proposal?.sourceItem?.originalUrl ?? article.source?.url;

      reply.header('Cache-Control', PUBLIC_DETAIL_CACHE_CONTROL);
      return {
        ...toSummary(article),
        analysis: translation?.analysis ?? '',
        sourceUrl,
      };
    } catch (error) {
      if (error instanceof articleService.ArticleError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });
}

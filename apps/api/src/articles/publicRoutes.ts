import { LanguageSchema } from '@orbis-fidei/validation';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import * as articleService from './service.js';

const ListQuerySchema = z.object({
  lang: LanguageSchema.default('FR'),
  page: z.coerce.number().int().positive().default(1),
});

const DetailQuerySchema = z.object({
  lang: LanguageSchema.default('FR'),
});

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

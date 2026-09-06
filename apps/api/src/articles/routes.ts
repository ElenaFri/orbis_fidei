import { ArticleCreateInputSchema, ArticleUpdateInputSchema } from '@orbis-fidei/validation';
import type { FastifyInstance } from 'fastify';

import { requirePermission } from '../auth/plugin.js';
import * as articleService from './service.js';

export async function registerArticleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/articles', { preHandler: requirePermission('article.read') }, async () =>
    articleService.listArticles(),
  );

  app.get<{ Params: { id: string } }>(
    '/admin/articles/:id',
    { preHandler: requirePermission('article.read') },
    async (request, reply) => {
      try {
        return await articleService.getArticle(request.params.id);
      } catch (error) {
        if (error instanceof articleService.ArticleError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/admin/articles',
    { preHandler: requirePermission('article.create') },
    async (request, reply) => {
      const parsed = ArticleCreateInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      if (!parsed.data.sourceId) {
        return reply
          .code(400)
          .send({ error: 'Une source est obligatoire pour un article manuel.' });
      }

      try {
        const article = await articleService.createArticle(parsed.data, request.currentUser!.id);
        return reply.code(201).send(article);
      } catch (error) {
        if (error instanceof articleService.ArticleError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/admin/articles/:id',
    { preHandler: requirePermission('article.edit') },
    async (request, reply) => {
      const parsed = ArticleUpdateInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        return await articleService.updateArticle(request.params.id, parsed.data);
      } catch (error) {
        if (error instanceof articleService.ArticleError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/articles/:id/publish',
    { preHandler: requirePermission('article.publish') },
    async (request, reply) => {
      try {
        return await articleService.publishArticle(request.params.id);
      } catch (error) {
        if (error instanceof articleService.ArticleError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/admin/articles/:id',
    { preHandler: requirePermission('article.edit') },
    async (request, reply) => {
      try {
        await articleService.deleteArticle(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof articleService.ArticleError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}

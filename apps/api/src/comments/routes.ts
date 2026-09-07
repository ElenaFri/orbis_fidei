import { CommentInputSchema, CommentUpdateInputSchema } from '@orbis-fidei/validation';
import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/plugin.js';
import * as commentService from './service.js';

export async function registerCommentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { articleId: string } }>('/articles/:articleId/comments', async (request) =>
    commentService.listComments(request.params.articleId),
  );

  app.post<{ Params: { articleId: string } }>(
    '/articles/:articleId/comments',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = CommentInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        const comment = await commentService.createComment(
          request.params.articleId,
          request.currentUser!.id,
          parsed.data,
        );
        return reply.code(201).send(comment);
      } catch (error) {
        if (error instanceof commentService.CommentError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/comments/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = CommentUpdateInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        const comment = await commentService.updateComment(
          request.params.id,
          request.currentUser!.id,
          parsed.data,
        );
        return reply.send(comment);
      } catch (error) {
        if (error instanceof commentService.CommentError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/comments/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const canModerate = request.currentUser!.permissions.includes('comment.moderate');
      try {
        await commentService.deleteComment(request.params.id, request.currentUser!.id, canModerate);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof commentService.CommentError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}

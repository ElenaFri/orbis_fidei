import { SourceInputSchema } from '@orbis-fidei/validation';
import type { FastifyInstance } from 'fastify';

import { requirePermission } from '../auth/plugin.js';
import * as sourceService from './service.js';

export async function registerSourceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/sources', { preHandler: requirePermission('source.manage') }, async () =>
    sourceService.listSources(),
  );

  app.get<{ Params: { id: string } }>(
    '/admin/sources/:id',
    { preHandler: requirePermission('source.manage') },
    async (request, reply) => {
      try {
        return await sourceService.getSource(request.params.id);
      } catch (error) {
        if (error instanceof sourceService.SourceError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/admin/sources',
    { preHandler: requirePermission('source.manage') },
    async (request, reply) => {
      const parsed = SourceInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        const source = await sourceService.createSource(parsed.data);
        return reply.code(201).send(source);
      } catch (error) {
        if (error instanceof sourceService.SourceError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/admin/sources/:id',
    { preHandler: requirePermission('source.manage') },
    async (request, reply) => {
      const parsed = SourceInputSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        return await sourceService.updateSource(request.params.id, parsed.data);
      } catch (error) {
        if (error instanceof sourceService.SourceError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/admin/sources/:id',
    { preHandler: requirePermission('source.manage') },
    async (request, reply) => {
      try {
        await sourceService.deleteSource(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof sourceService.SourceError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}

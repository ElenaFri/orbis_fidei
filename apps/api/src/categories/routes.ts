import { CategoryInputSchema } from '@orbis-fidei/validation';
import type { FastifyInstance } from 'fastify';

import { requirePermission } from '../auth/plugin.js';
import * as categoryService from './service.js';

export async function registerCategoryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/categories', { preHandler: requirePermission('category.manage') }, async () =>
    categoryService.listCategories(),
  );

  app.get<{ Params: { id: string } }>(
    '/admin/categories/:id',
    { preHandler: requirePermission('category.manage') },
    async (request, reply) => {
      try {
        return await categoryService.getCategory(request.params.id);
      } catch (error) {
        if (error instanceof categoryService.CategoryError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/admin/categories',
    { preHandler: requirePermission('category.manage') },
    async (request, reply) => {
      const parsed = CategoryInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        const category = await categoryService.createCategory(parsed.data);
        return reply.code(201).send(category);
      } catch (error) {
        if (error instanceof categoryService.CategoryError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/admin/categories/:id',
    { preHandler: requirePermission('category.manage') },
    async (request, reply) => {
      const parsed = CategoryInputSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        return await categoryService.updateCategory(request.params.id, parsed.data);
      } catch (error) {
        if (error instanceof categoryService.CategoryError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/admin/categories/:id',
    { preHandler: requirePermission('category.manage') },
    async (request, reply) => {
      try {
        await categoryService.deleteCategory(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof categoryService.CategoryError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}

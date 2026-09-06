import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { requirePermission } from '../auth/plugin.js';
import * as userService from './service.js';

const UpdateUserSchema = z.object({
  roleIds: z.array(z.string().cuid()).optional(),
  isActive: z.boolean().optional(),
});

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/users', { preHandler: requirePermission('user.manage') }, async () =>
    userService.listUsers(),
  );

  app.get('/admin/roles', { preHandler: requirePermission('user.manage') }, async () =>
    userService.listRoles(),
  );

  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: requirePermission('user.manage') },
    async (request, reply) => {
      try {
        return await userService.getUser(request.params.id);
      } catch (error) {
        if (error instanceof userService.UserManagementError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: requirePermission('user.manage') },
    async (request, reply) => {
      const parsed = UpdateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Requête invalide.', details: parsed.error.flatten() });
      }

      try {
        return await userService.updateUser(request.params.id, parsed.data);
      } catch (error) {
        if (error instanceof userService.UserManagementError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}

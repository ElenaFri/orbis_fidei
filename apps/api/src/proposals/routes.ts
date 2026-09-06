import type { FastifyInstance } from 'fastify';

import { requirePermission } from '../auth/plugin.js';
import * as proposalService from './service.js';

export async function registerProposalRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/suggestions', { preHandler: requirePermission('proposal.review') }, async () =>
    proposalService.listPendingProposals(),
  );

  app.get<{ Params: { id: string } }>(
    '/admin/suggestions/:id',
    { preHandler: requirePermission('proposal.review') },
    async (request, reply) => {
      try {
        return await proposalService.getProposal(request.params.id);
      } catch (error) {
        if (error instanceof proposalService.ProposalError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/suggestions/:id/accept',
    { preHandler: requirePermission('proposal.review') },
    async (request, reply) => {
      try {
        return reply
          .code(201)
          .send(await proposalService.acceptProposal(request.params.id, request.currentUser!.id));
      } catch (error) {
        if (error instanceof proposalService.ProposalError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/suggestions/:id/reject',
    { preHandler: requirePermission('proposal.review') },
    async (request, reply) => {
      try {
        return reply.send(
          await proposalService.rejectProposal(request.params.id, request.currentUser!.id),
        );
      } catch (error) {
        if (error instanceof proposalService.ProposalError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}

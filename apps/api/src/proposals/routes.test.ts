import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();

vi.mock('./service.js', () => ({
  listPendingProposals: vi.fn().mockResolvedValue([]),
  getProposal: vi.fn().mockResolvedValue({ id: 'proposal_1', status: 'PENDING' }),
  acceptProposal: vi.fn().mockResolvedValue({ id: 'article_1', status: 'DRAFT' }),
  rejectProposal: vi.fn().mockResolvedValue({ id: 'proposal_1', status: 'REJECTED' }),
  ProposalError: class ProposalError extends Error {
    constructor(
      message: string,
      public readonly statusCode = 400,
    ) {
      super(message);
    }
  },
}));

const { default: authPlugin } = await import('../auth/plugin.js');
const { signAccessToken } = await import('../auth/tokens.js');
const { registerProposalRoutes } = await import('./routes.js');

function token(permissions: string[]): string {
  return signAccessToken({ sub: 'user_1', email: 'a@b.com', permissions });
}

async function buildApp() {
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(registerProposalRoutes);
  return app;
}

describe('proposal routes', () => {
  it('requires proposal.review to list suggestions', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/admin/suggestions' });
    expect(response.statusCode).toBe(401);
  });

  it('lists suggestions with the required permission', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin/suggestions',
      headers: { authorization: `Bearer ${token(['proposal.review'])}` },
    });
    expect(response.statusCode).toBe(200);
  });

  it('accepts a suggestion', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/suggestions/proposal_1/accept',
      headers: { authorization: `Bearer ${token(['proposal.review'])}` },
    });
    expect(response.statusCode).toBe(201);
  });

  it('rejects a suggestion', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/suggestions/proposal_1/reject',
      headers: { authorization: `Bearer ${token(['proposal.review'])}` },
    });
    expect(response.statusCode).toBe(200);
  });
});

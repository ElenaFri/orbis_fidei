import Fastify, { type FastifyInstance } from 'fastify';

import { setTestEnv } from './env.js';

export type RouteRegistrar = (app: FastifyInstance) => Promise<void>;

/**
 * Builds a minimal Fastify app (auth plugin + one route registrar) for a domain's
 * integration tests (sources/categories/articles…).
 */
export async function buildAdminTestApp(registerRoutes: RouteRegistrar): Promise<FastifyInstance> {
  setTestEnv();
  const { default: authPlugin } = await import('../auth/plugin.js');

  const app = Fastify();
  await app.register(authPlugin);
  await app.register(registerRoutes);
  return app;
}

/** Issues a test access token with the given permissions. */
export async function tokenWith(permissions: string[]): Promise<string> {
  setTestEnv();
  const { signAccessToken } = await import('../auth/tokens.js');
  return signAccessToken({ sub: 'user_1', email: 'a@b.com', permissions });
}

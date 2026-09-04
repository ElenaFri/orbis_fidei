import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

import { verifyAccessToken } from './tokens.js';

export interface CurrentUser {
  id: string;
  email: string;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: CurrentUser | null;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('currentUser', null);

  app.addHook('onRequest', async (request) => {
    const token = extractBearerToken(request);
    if (!token) return;

    try {
      const payload = verifyAccessToken(token);
      request.currentUser = {
        id: payload.sub,
        email: payload.email,
        permissions: payload.permissions,
      };
    } catch {
      request.currentUser = null;
    }
  });
};

export default fp(authPlugin, { name: 'auth' });

/** Rejects the request with 401 if there is no authenticated user. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.currentUser) {
    await reply.code(401).send({ error: 'Authentification requise.' });
  }
}

/** Rejects the request if the user is not authenticated or lacks the required permission. */
export function requirePermission(permissionKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.currentUser;
    if (!user) {
      await reply.code(401).send({ error: 'Authentification requise.' });
      return;
    }
    if (!user.permissions.includes(permissionKey)) {
      await reply.code(403).send({ error: 'Permission insuffisante.' });
    }
  };
}

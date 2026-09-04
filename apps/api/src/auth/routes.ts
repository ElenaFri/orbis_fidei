import { LoginSchema, RegisterSchema } from '@orbis-fidei/validation';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { config } from '../config.js';
import { requireAuth } from './plugin.js';
import * as authService from './service.js';
import { REFRESH_COOKIE_NAME } from './tokens.js';

const REFRESH_COOKIE_PATH = '/auth';

function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: 60 * 60 * 24 * 7, // 7 jours, cohérent avec JWT_REFRESH_TTL par défaut
  });
}

function clearRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/register', async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    try {
      const result = await authService.register(parsed.data);
      setRefreshCookie(reply, result.refreshToken);
      return reply.code(201).send({ accessToken: result.accessToken, user: result.user });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);
      setRefreshCookie(reply, result.refreshToken);
      return reply.send({ accessToken: result.accessToken, user: result.user });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      return reply.code(401).send({ error: 'Refresh token manquant.' });
    }

    try {
      const result = await authService.refresh(token);
      setRefreshCookie(reply, result.refreshToken);
      return reply.send({ accessToken: result.accessToken, user: result.user });
    } catch (error) {
      clearRefreshCookie(reply);
      if (error instanceof authService.AuthError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/logout', async (_request, reply) => {
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });

  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const me = await authService.getMe(request.currentUser!.id);
    if (!me) {
      return reply.code(404).send({ error: 'Utilisateur introuvable.' });
    }
    return reply.send(me);
  });
}

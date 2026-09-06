import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();

vi.mock('./service.js', () => ({
  listUsers: vi.fn().mockResolvedValue([]),
  listRoles: vi.fn().mockResolvedValue([]),
  getUser: vi.fn().mockResolvedValue({ id: 'user_1' }),
  updateUser: vi.fn().mockResolvedValue({ id: 'user_1', isActive: true }),
  UserManagementError: class UserManagementError extends Error {
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
const { registerUserRoutes } = await import('./routes.js');

async function buildApp() {
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(registerUserRoutes);
  return app;
}

function token(permissions: string[]): string {
  return signAccessToken({ sub: 'user_1', email: 'admin@example.com', permissions });
}

describe('user management routes', () => {
  it('requires user.manage', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/admin/users' });
    expect(response.statusCode).toBe(401);
  });

  it('lists users and roles with the permission', async () => {
    const app = await buildApp();
    const headers = { authorization: `Bearer ${token(['user.manage'])}` };
    expect((await app.inject({ method: 'GET', url: '/admin/users', headers })).statusCode).toBe(
      200,
    );
    expect((await app.inject({ method: 'GET', url: '/admin/roles', headers })).statusCode).toBe(
      200,
    );
  });

  it('updates a user', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/users/user_1',
      headers: { authorization: `Bearer ${token(['user.manage'])}` },
      payload: { isActive: false },
    });
    expect(response.statusCode).toBe(200);
  });

  it('gets a user by id', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin/users/user_1',
      headers: { authorization: `Bearer ${token(['user.manage'])}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 'user_1' });
  });

  it('handles user not found on get user', async () => {
    const service = await import('./service.js');
    vi.mocked(service.getUser).mockRejectedValueOnce(
      new service.UserManagementError('Utilisateur introuvable.', 404),
    );
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin/users/unknown',
      headers: { authorization: `Bearer ${token(['user.manage'])}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('rejects update with invalid payload', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/users/user_1',
      headers: { authorization: `Bearer ${token(['user.manage'])}` },
      payload: { roleIds: 'not-an-array' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('handles service errors on update', async () => {
    const service = await import('./service.js');
    vi.mocked(service.updateUser).mockRejectedValueOnce(
      new service.UserManagementError(
        'Le dernier administrateur actif ne peut pas être retiré.',
        409,
      ),
    );
    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/users/user_1',
      headers: { authorization: `Bearer ${token(['user.manage'])}` },
      payload: { isActive: false },
    });
    expect(response.statusCode).toBe(409);
  });
});

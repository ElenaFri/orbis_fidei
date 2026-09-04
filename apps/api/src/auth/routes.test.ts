import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

interface FakeUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  preferredLang: string;
  isActive: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const users = new Map<string, FakeUser>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          return [...users.values()].find((u) => u.email === where.email) ?? null;
        }
        if (where.id) {
          return users.get(where.id) ?? null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Partial<FakeUser> }) => {
        const id = `user_${nextId++}`;
        const user: FakeUser = {
          id,
          email: data.email!,
          passwordHash: data.passwordHash!,
          displayName: data.displayName!,
          preferredLang: (data.preferredLang as string) ?? 'FR',
          isActive: true,
          tokenVersion: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.set(id, user);
        return user;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { tokenVersion?: { increment: number } };
        }) => {
          const user = users.get(where.id);
          if (!user) throw new Error('not found');
          if (data.tokenVersion?.increment) {
            user.tokenVersion += data.tokenVersion.increment;
          }
          return user;
        },
      ),
    },
    userRole: {
      findMany: vi.fn(async () => []),
    },
  },
}));

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789';
process.env.NODE_ENV = 'test';

const { buildApp } = await import('../app.js');

describe('Auth flow', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const credentials = { email: 'jane@orbisfidei.test', password: 'a-strong-password' };

  it('refuse un enregistrement avec un mot de passe trop court', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'x@test.com', password: 'short', displayName: 'X' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('enregistre un utilisateur et renvoie un access token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...credentials, displayName: 'Jane Doe' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user.email).toBe(credentials.email);
    expect(response.cookies.some((c) => c.name === 'orbis_refresh_token')).toBe(true);
  });

  it('refuse un second enregistrement avec le même email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...credentials, displayName: 'Jane Doe' },
    });
    expect(response.statusCode).toBe(409);
  });

  it('connecte un utilisateur existant', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: credentials });
    expect(response.statusCode).toBe(200);
    expect(response.json().accessToken).toEqual(expect.any(String));
  });

  it('refuse une connexion avec un mauvais mot de passe', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: credentials.email, password: 'wrong-password' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejette /me sans access token', async () => {
    const response = await app.inject({ method: 'GET', url: '/me' });
    expect(response.statusCode).toBe(401);
  });

  it('renvoie le profil courant avec un access token valide', async () => {
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: credentials });
    const { accessToken } = login.json();

    const response = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().email).toBe(credentials.email);
  });

  it('rafraîchit les tokens via le cookie de refresh', async () => {
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: credentials });
    const refreshCookie = login.cookies.find((c) => c.name === 'orbis_refresh_token');

    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { orbis_refresh_token: refreshCookie!.value },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().accessToken).toEqual(expect.any(String));
  });

  it('déconnecte en supprimant le cookie de refresh', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(response.statusCode).toBe(204);
  });
});

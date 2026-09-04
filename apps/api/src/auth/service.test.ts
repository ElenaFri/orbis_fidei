import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  preferredLang: string;
  isActive: boolean;
  tokenVersion: number;
}

const users = new Map<string, FakeUser>();

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return [...users.values()].find((u) => u.email === where.email) ?? null;
        if (where.id) return users.get(where.id) ?? null;
        return null;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Omit<Partial<FakeUser>, 'tokenVersion'> & { tokenVersion?: { increment: number } };
        }) => {
          const user = users.get(where.id);
          if (!user) throw new Error('not found');
          if (data.tokenVersion) {
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

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();

const service = await import('./service.js');
const { signRefreshToken } = await import('./tokens.js');

function seedUser(overrides: Partial<FakeUser> = {}): FakeUser {
  const user: FakeUser = {
    id: `user_${users.size + 1}`,
    email: `user${users.size + 1}@test.com`,
    passwordHash: 'irrelevant',
    displayName: 'Test User',
    preferredLang: 'FR',
    isActive: true,
    tokenVersion: 0,
    ...overrides,
  };
  users.set(user.id, user);
  return user;
}

describe('refresh', () => {
  afterEach(() => users.clear());

  it('rejette un refresh token invalide', async () => {
    await expect(service.refresh('not-a-valid-token')).rejects.toThrow(service.AuthError);
  });

  it('rejette un refresh token dont la version ne correspond plus (session révoquée)', async () => {
    const user = seedUser();
    const token = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

    await service.revokeAllSessions(user.id);

    await expect(service.refresh(token)).rejects.toThrow(service.AuthError);
  });

  it('émet de nouveaux tokens quand la version correspond', async () => {
    const user = seedUser();
    const token = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

    const result = await service.refresh(token);

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user.id).toBe(user.id);
  });
});

describe('revokeAllSessions', () => {
  afterEach(() => users.clear());

  it("incrémente la version de token de l'utilisateur", async () => {
    const user = seedUser();
    await service.revokeAllSessions(user.id);
    expect(users.get(user.id)?.tokenVersion).toBe(1);
  });
});

describe('getMe', () => {
  afterEach(() => users.clear());

  it('renvoie null pour un utilisateur inactif', async () => {
    const user = seedUser({ isActive: false });
    await expect(service.getMe(user.id)).resolves.toBeNull();
  });

  it('renvoie null pour un utilisateur inexistant', async () => {
    await expect(service.getMe('unknown')).resolves.toBeNull();
  });

  it('renvoie le profil pour un utilisateur actif', async () => {
    const user = seedUser();
    await expect(service.getMe(user.id)).resolves.toMatchObject({ id: user.id, email: user.email });
  });
});

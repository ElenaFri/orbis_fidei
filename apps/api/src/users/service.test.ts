import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeUser = {
  id: string;
  email: string;
  displayName: string;
  preferredLang: string;
  isActive: boolean;
  roles: { roleId: string; role: { id: string; name: string } }[];
};
type FakeRole = { id: string; name: string };

type FindUserArgs = { where: { id?: string; email?: string } };
type RoleFindArgs = { where?: { id?: { in: string[] }; name?: string } };

const users = new Map<string, FakeUser>();
const roles = new Map<string, FakeRole>();

vi.mock('@orbis-fidei/database', () => {
  const prisma = {
    user: {
      findMany: vi.fn(async () => [...users.values()]),
      findUnique: vi.fn(async ({ where }: FindUserArgs) => {
        if (where.id) return users.get(where.id) ?? null;
        return [...users.values()].find((user) => user.email === where.email) ?? null;
      }),
      count: vi.fn(
        async ({
          where,
        }: {
          where: { roles: { some: { roleId: string } }; NOT: { id: string } };
        }) =>
          [...users.values()].filter(
            (user) =>
              user.isActive &&
              user.roles.some((role) => role.roleId === where.roles.some.roleId) &&
              user.id !== where.NOT.id,
          ).length,
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
          ...users.get(where.id),
          ...data,
        }),
      ),
    },
    role: {
      findMany: vi.fn(async ({ where }: RoleFindArgs = {}) => {
        const roleIds = where?.id?.in;
        if (roleIds) return [...roles.values()].filter((role) => roleIds.includes(role.id));
        return [...roles.values()];
      }),
      findUnique: vi.fn(
        async ({ where }: { where: { name: string } }) =>
          [...roles.values()].find((role) => role.name === where.name) ?? null,
      ),
    },
    userRole: {
      deleteMany: vi.fn(async () => undefined),
      createMany: vi.fn(async () => undefined),
    },
  };
  return {
    prisma: {
      ...prisma,
      $transaction: async (callback: (transaction: typeof prisma) => unknown) => callback(prisma),
    },
  };
});

const service = await import('./service.js');

function seedUser(overrides: Partial<FakeUser> = {}): FakeUser {
  const user: FakeUser = {
    id: 'user_1',
    email: 'user@example.com',
    displayName: 'User',
    preferredLang: 'FR',
    isActive: true,
    roles: [{ roleId: 'role_user', role: { id: 'role_user', name: 'REGISTERED_USER' } }],
    ...overrides,
  };
  users.set(user.id, user);
  return user;
}

describe('user management service', () => {
  afterEach(() => {
    users.clear();
    roles.clear();
  });

  it('lists users and roles', async () => {
    seedUser();
    roles.set('role_user', { id: 'role_user', name: 'REGISTERED_USER' });
    await expect(service.listUsers()).resolves.toHaveLength(1);
    await expect(service.listRoles()).resolves.toHaveLength(1);
  });

  it('updates roles and increments token version', async () => {
    seedUser();
    roles.set('role_editor', { id: 'role_editor', name: 'EDITOR_IN_CHIEF' });
    const updated = await service.updateUser('user_1', { roleIds: ['role_editor'] });
    expect(updated.id).toBe('user_1');
  });

  it('rejects an unknown role', async () => {
    seedUser();
    await expect(service.updateUser('user_1', { roleIds: ['missing'] })).rejects.toThrow(
      'introuvables',
    );
  });

  it('protects the last active administrator', async () => {
    seedUser({ roles: [{ roleId: 'role_admin', role: { id: 'role_admin', name: 'ADMIN' } }] });
    roles.set('role_admin', { id: 'role_admin', name: 'ADMIN' });
    await expect(service.updateUser('user_1', { isActive: false, roleIds: [] })).rejects.toThrow(
      'dernier administrateur',
    );
  });

  it('rejects an unknown user', async () => {
    await expect(service.updateUser('missing', { isActive: false })).rejects.toThrow('introuvable');
  });
});

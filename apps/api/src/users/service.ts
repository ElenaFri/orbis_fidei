import { prisma } from '@orbis-fidei/database';

export class UserManagementError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'UserManagementError';
  }
}

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  preferredLang: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  roles: { include: { role: { select: { id: true, name: true } } } },
} as const;

export function listUsers() {
  return prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'desc' } });
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) throw new UserManagementError('Utilisateur introuvable.', 404);
  return user;
}

export function listRoles() {
  return prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
    orderBy: { name: 'asc' },
  });
}

async function ensureAdminNotRemoved(userId: string, roleIds: string[], isActive: boolean) {
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
    select: { id: true },
  });
  if (!adminRole) return;

  const keepsAdmin = isActive && roleIds.includes(adminRole.id);
  if (keepsAdmin) return;

  const activeAdmins = await prisma.user.count({
    where: {
      isActive: true,
      roles: { some: { roleId: adminRole.id } },
      NOT: { id: userId },
    },
  });
  if (activeAdmins === 0) {
    throw new UserManagementError('Le dernier administrateur actif ne peut pas être retiré.', 409);
  }
}

export async function updateUser(id: string, input: { roleIds?: string[]; isActive?: boolean }) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true, roles: { select: { roleId: true } } },
  });
  if (!user) throw new UserManagementError('Utilisateur introuvable.', 404);

  const roleIds = input.roleIds ?? user.roles.map((role) => role.roleId);
  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds } },
    select: { id: true },
  });
  if (roles.length !== roleIds.length) {
    throw new UserManagementError('Un ou plusieurs rôles sont introuvables.', 400);
  }

  await ensureAdminNotRemoved(id, roleIds, input.isActive ?? user.isActive);

  return prisma.$transaction(async (transaction) => {
    if (input.roleIds) {
      await transaction.userRole.deleteMany({ where: { userId: id } });
      await transaction.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    return transaction.user.update({
      where: { id },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        tokenVersion: { increment: 1 },
      },
      select: USER_SELECT,
    });
  });
}

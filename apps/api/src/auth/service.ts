import { prisma } from '@orbis-fidei/database';
import type { RegisterInput } from '@orbis-fidei/validation';

import { hashPassword, verifyPassword } from './password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens.js';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const DEFAULT_ROLE_NAME = 'REGISTERED_USER';

async function loadPermissions(userId: string): Promise<string[]> {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  const keys = new Set<string>();
  for (const { role } of roles) {
    for (const { permission } of role.permissions) {
      keys.add(permission.key);
    }
  }
  return [...keys];
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    preferredLang: string;
    permissions: string[];
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AuthError('Cet email est déjà utilisé.', 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      preferredLang: input.preferredLang,
      roles: {
        create: {
          role: {
            connectOrCreate: {
              where: { name: DEFAULT_ROLE_NAME },
              create: { name: DEFAULT_ROLE_NAME },
            },
          },
        },
      },
    },
  });

  const permissions = await loadPermissions(user.id);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, permissions });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      preferredLang: user.preferredLang,
      permissions,
    },
  };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.isActive) {
    throw new AuthError('Identifiants invalides.');
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new AuthError('Identifiants invalides.');
  }

  const permissions = await loadPermissions(user.id);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, permissions });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      preferredLang: user.preferredLang,
      permissions,
    },
  };
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError('Refresh token invalide ou expiré.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw new AuthError('Refresh token révoqué.');
  }

  const permissions = await loadPermissions(user.id);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, permissions });
  const newRefreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      preferredLang: user.preferredLang,
      permissions,
    },
  };
}

/** Révoque tous les refresh tokens émis pour cet utilisateur (logout global). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

export async function getMe(userId: string): Promise<AuthResult['user'] | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isActive) return null;

  const permissions = await loadPermissions(user.id);
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    preferredLang: user.preferredLang,
    permissions,
  };
}

export type { AccessTokenPayload } from './tokens.js';

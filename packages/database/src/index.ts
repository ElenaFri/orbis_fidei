import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var __orbisPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
    globalThis.__orbisPrisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalThis.__orbisPrisma = prisma;
}

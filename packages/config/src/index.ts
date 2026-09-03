import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Remonte l'arborescence depuis `startDir` jusqu'à trouver un `.env` (typiquement à la racine du monorepo).
export function loadRootEnv(startDir: string, filename = '.env'): string | null {
  let current = startDir;
  while (true) {
    const candidate = resolve(current, filename);
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    console.error('✗ Configuration invalide :', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

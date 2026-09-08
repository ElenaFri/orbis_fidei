import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRootEnv, parseEnv } from '@orbis-fidei/config';
import { z } from 'zod';

loadRootEnv(dirname(fileURLToPath(import.meta.url)));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_HOST: z.string().default('0.0.0.0'),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    API_CORS_ORIGIN: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production') {
      for (const [name, value] of [
        ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
        ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
      ] as const) {
        if (value.startsWith('change-me') || value.length < 32) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [name],
            message: 'A production secret must be unique and at least 32 characters long.',
          });
        }
      }
    }
  });

export const config = parseEnv(envSchema);
export type Config = typeof config;

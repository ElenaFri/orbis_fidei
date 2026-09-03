import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseEnv } from './index.js';

const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
});

describe('parseEnv', () => {
  it('parse une configuration valide', () => {
    const result = parseEnv(schema, {
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    } as unknown as NodeJS.ProcessEnv);

    expect(result.PORT).toBe(3000);
    expect(result.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
  });

  it('lève une erreur en cas de configuration invalide', () => {
    expect(() =>
      parseEnv(schema, { PORT: 'not-a-number' } as unknown as NodeJS.ProcessEnv),
    ).toThrowError();
  });
});

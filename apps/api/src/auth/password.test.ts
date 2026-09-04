import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hash puis vérifie un mot de passe correct', async () => {
    const hash = await hashPassword('a-strong-password');
    expect(hash).not.toBe('a-strong-password');
    await expect(verifyPassword(hash, 'a-strong-password')).resolves.toBe(true);
  });

  it('rejette un mot de passe incorrect', async () => {
    const hash = await hashPassword('a-strong-password');
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('renvoie false plutôt que de lever une erreur sur un hash invalide', async () => {
    await expect(verifyPassword('not-a-valid-argon2-hash', 'anything')).resolves.toBe(false);
  });
});

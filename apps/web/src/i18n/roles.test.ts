import { describe, expect, it } from 'vitest';

import { translateRole } from './roles.js';

describe('translateRole', () => {
  it('returns the translated role label when key exists', () => {
    const t = (key: string) => (key === 'roles.ADMIN' ? 'Administrateur' : key);
    expect(translateRole(t, 'ADMIN')).toBe('Administrateur');
  });

  it('falls back to the raw role name when key is not translated', () => {
    const t = (key: string) => key;
    expect(translateRole(t, 'CUSTOM_ROLE')).toBe('CUSTOM_ROLE');
  });
});

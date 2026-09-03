import { describe, expect, it } from 'vitest';

import { LoginSchema, RegisterSchema, CommentInputSchema } from './index.js';

describe('LoginSchema', () => {
  it('accepte des identifiants valides', () => {
    const result = LoginSchema.safeParse({
      email: 'user@example.com',
      password: 'a-strong-password',
    });
    expect(result.success).toBe(true);
  });

  it('refuse un email invalide', () => {
    const result = LoginSchema.safeParse({ email: 'not-an-email', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('refuse un mot de passe trop court', () => {
    const result = LoginSchema.safeParse({ email: 'user@example.com', password: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('RegisterSchema', () => {
  it("applique la langue par défaut à FR quand elle n'est pas fournie", () => {
    const result = RegisterSchema.safeParse({
      email: 'user@example.com',
      password: 'a-strong-password',
      displayName: 'Utilisateur',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferredLang).toBe('FR');
    }
  });
});

describe('CommentInputSchema', () => {
  it('refuse un commentaire vide', () => {
    const result = CommentInputSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('accepte un commentaire simple', () => {
    const result = CommentInputSchema.safeParse({ content: 'Bel article.' });
    expect(result.success).toBe(true);
  });
});

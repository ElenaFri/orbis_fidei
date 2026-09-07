import { describe, expect, it } from 'vitest';

import {
  LoginSchema,
  RegisterSchema,
  CommentInputSchema,
  SourceInputSchema,
  CategoryInputSchema,
  ArticleCreateInputSchema,
  ArticleUpdateInputSchema,
  slugify,
} from './index.js';

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

describe('SourceInputSchema', () => {
  it('applique les valeurs par défaut (fetchIntervalMin, status)', () => {
    const result = SourceInputSchema.safeParse({
      name: 'Radio Notre-Dame',
      url: 'https://radionotredame.net',
      language: 'FR',
      type: 'RSS',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fetchIntervalMin).toBe(60);
      expect(result.data.status).toBe('ACTIVE');
    }
  });

  it('refuse une URL invalide', () => {
    const result = SourceInputSchema.safeParse({
      name: 'Radio Notre-Dame',
      url: 'not-a-url',
      language: 'FR',
      type: 'RSS',
    });
    expect(result.success).toBe(false);
  });
});

describe('CategoryInputSchema', () => {
  it('accepte une clé en minuscules avec tirets', () => {
    const result = CategoryInputSchema.safeParse({
      key: 'church-news',
      labelFr: 'Actualité des Églises',
      labelEn: 'Church news',
      labelRu: 'Церковные новости',
    });
    expect(result.success).toBe(true);
  });

  it('refuse une clé avec des majuscules ou des espaces', () => {
    const result = CategoryInputSchema.safeParse({
      key: 'Church News',
      labelFr: 'Actualité des Églises',
      labelEn: 'Church news',
      labelRu: 'Церковные новости',
    });
    expect(result.success).toBe(false);
  });
});

describe('ArticleCreateInputSchema', () => {
  it('accepte un article avec au moins une traduction', () => {
    const result = ArticleCreateInputSchema.safeParse({
      slug: 'le-patriarche-rencontre',
      originalLang: 'FR',
      translations: [
        {
          language: 'FR',
          title: 'Titre suffisant',
          summary: 'Résumé suffisamment long.',
          analysis: 'Analyse suffisamment longue.',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryIds).toEqual([]);
    }
  });

  it('refuse un article sans aucune traduction', () => {
    const result = ArticleCreateInputSchema.safeParse({
      slug: 'le-patriarche-rencontre',
      originalLang: 'FR',
      translations: [],
    });
    expect(result.success).toBe(false);
  });

  it('refuse un slug avec des caractères invalides', () => {
    const result = ArticleCreateInputSchema.safeParse({
      slug: 'Le Patriarche Rencontre !',
      originalLang: 'FR',
      translations: [
        {
          language: 'FR',
          title: 'Titre suffisant',
          summary: 'Résumé suffisamment long.',
          analysis: 'Analyse suffisamment longue.',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('ArticleUpdateInputSchema', () => {
  it('accepte une mise à jour de slug valide', () => {
    const result = ArticleUpdateInputSchema.safeParse({
      slug: 'nouveau-slug-valide',
    });
    expect(result.success).toBe(true);
  });

  it('refuse un slug avec des caractères invalides en mise à jour', () => {
    const result = ArticleUpdateInputSchema.safeParse({
      slug: 'Invalide Slug !',
    });
    expect(result.success).toBe(false);
  });
});

describe('slugify', () => {
  it('supprime les accents et remplace les espaces par des tirets', () => {
    expect(slugify('Rentrée scolaire à Bukavu malgré la menace d’Ébola')).toBe(
      'rentree-scolaire-a-bukavu-malgre-la-menace-d-ebola',
    );
  });

  it('translitère le cyrillique en caractères latins', () => {
    expect(slugify('Новости христиан со всего мира')).toBe('novosti-khristian-so-vsego-mira');
  });

  it('renvoie article si le texte est vide ou composé uniquement de symboles', () => {
    expect(slugify('')).toBe('article');
    expect(slugify('??? !!!')).toBe('article');
  });
});

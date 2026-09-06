import { describe, expect, it, vi } from 'vitest';

import {
  translateApprovedArticle,
  translateArticle,
  type TranslatorDependencies,
  type TranslationProvider,
} from './translator.js';
import { FakeTranslationProvider } from './providers.js';

function createDependencies(overrides: Partial<{ provider: TranslationProvider }> = {}) {
  const translations = new Map<
    string,
    {
      id: string;
      articleId: string;
      language: string;
      title: string;
      summary: string;
      analysis: string;
    }
  >();
  let nextId = 1;
  const prisma = {
    articleTranslation: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { articleId_language: { articleId: string; language: string } };
        }) => {
          const key = `${where.articleId_language.articleId}:${where.articleId_language.language}`;
          return translations.get(key) ?? null;
        },
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: Omit<
            {
              articleId: string;
              language: string;
              title: string;
              summary: string;
              analysis: string;
              status: string;
              isMachine: boolean;
            },
            'id'
          >;
        }) => {
          const id = `translation_${nextId++}`;
          translations.set(`${data.articleId}:${data.language}`, { id, ...data });
          return { id };
        },
      ),
    },
  } as unknown as TranslatorDependencies['prisma'];
  return { prisma, translations, provider: overrides.provider ?? new FakeTranslationProvider() };
}

const source = { title: 'Titre', summary: 'Résumé', analysis: 'Analyse' };

describe('translateArticle', () => {
  it('creates a machine translation with TRANSLATED status', async () => {
    const dependencies = createDependencies();
    dependencies.translations.set('article_1:FR', {
      id: 'fr_1',
      articleId: 'article_1',
      language: 'FR',
      ...source,
    });

    const result = await translateArticle('article_1', 'FR', 'EN', dependencies as never);

    expect(result).toEqual({ translationId: 'translation_1', created: true });
    expect(dependencies.prisma.articleTranslation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'TRANSLATED', isMachine: true }),
      }),
    );
  });

  it('is idempotent when the target translation already exists', async () => {
    const dependencies = createDependencies();
    dependencies.translations.set('article_1:FR', {
      id: 'fr_1',
      articleId: 'article_1',
      language: 'FR',
      ...source,
    });
    dependencies.translations.set('article_1:EN', {
      id: 'en_1',
      articleId: 'article_1',
      language: 'EN',
      ...source,
    });

    const result = await translateArticle('article_1', 'FR', 'EN', dependencies as never);

    expect(result).toEqual({ translationId: 'en_1', created: false });
    expect(dependencies.prisma.articleTranslation.create).not.toHaveBeenCalled();
  });

  it('rejects identical source and target languages', async () => {
    const dependencies = createDependencies();
    await expect(translateArticle('article_1', 'FR', 'FR', dependencies as never)).rejects.toThrow(
      'Source and target languages must differ',
    );
  });

  it('rejects when the source translation is missing', async () => {
    const dependencies = createDependencies();
    await expect(translateArticle('article_1', 'FR', 'EN', dependencies as never)).rejects.toThrow(
      'Source translation not found',
    );
  });
});

describe('translateApprovedArticle', () => {
  it('creates both target translations', async () => {
    const dependencies = createDependencies();
    dependencies.translations.set('article_1:FR', {
      id: 'fr_1',
      articleId: 'article_1',
      language: 'FR',
      ...source,
    });

    const result = await translateApprovedArticle('article_1', 'FR', dependencies as never);

    expect(result).toHaveLength(2);
    expect(dependencies.prisma.articleTranslation.create).toHaveBeenCalledTimes(2);
  });
});

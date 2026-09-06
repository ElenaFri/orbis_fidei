import type { PrismaClient } from '@orbis-fidei/database';

export type Language = 'FR' | 'EN' | 'RU';

export interface ArticleContent {
  title: string;
  summary: string;
  analysis: string;
}

export interface TranslationProvider {
  translate(
    content: ArticleContent,
    sourceLang: Language,
    targetLang: Language,
  ): Promise<ArticleContent>;
}

export interface TranslatorDependencies {
  prisma: PrismaClient;
  provider: TranslationProvider;
  now?: () => Date;
}

export class TranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationError';
  }
}

async function loadArticleContent(
  articleId: string,
  sourceLang: Language,
  prisma: PrismaClient,
): Promise<ArticleContent> {
  const translation = await prisma.articleTranslation.findUnique({
    where: { articleId_language: { articleId, language: sourceLang } },
    select: { title: true, summary: true, analysis: true },
  });
  if (!translation)
    throw new TranslationError(`Source translation not found: ${articleId}/${sourceLang}`);
  return translation;
}

export async function translateArticle(
  articleId: string,
  sourceLang: Language,
  targetLang: Language,
  dependencies: TranslatorDependencies,
): Promise<{ translationId: string; created: boolean }> {
  if (sourceLang === targetLang)
    throw new TranslationError('Source and target languages must differ.');

  const existing = await dependencies.prisma.articleTranslation.findUnique({
    where: { articleId_language: { articleId, language: targetLang } },
    select: { id: true, status: true },
  });
  if (existing) return { translationId: existing.id, created: false };

  const source = await loadArticleContent(articleId, sourceLang, dependencies.prisma);
  const translated = await dependencies.provider.translate(source, sourceLang, targetLang);
  const result = await dependencies.prisma.articleTranslation.create({
    data: {
      articleId,
      language: targetLang,
      title: translated.title,
      summary: translated.summary,
      analysis: translated.analysis,
      status: 'TRANSLATED',
      isMachine: true,
    },
    select: { id: true },
  });

  return { translationId: result.id, created: true };
}

export async function translateApprovedArticle(
  articleId: string,
  sourceLang: Language,
  dependencies: TranslatorDependencies,
): Promise<Array<{ translationId: string; created: boolean }>> {
  const targets = (['FR', 'EN', 'RU'] as const).filter((language) => language !== sourceLang);
  return Promise.all(
    targets.map((target) => translateArticle(articleId, sourceLang, target, dependencies)),
  );
}

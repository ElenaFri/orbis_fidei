export type Language = 'FR' | 'EN' | 'RU';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['FR', 'EN', 'RU'] as const;

export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  language: Language;
  publishedAt: string | null;
  sourceName?: string;
  categoryKeys: string[];
  commentCount: number;
}

export interface ArticleDetail extends ArticleSummary {
  analysis: string;
  sourceUrl?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  preferredLang: Language;
  permissions: string[];
}

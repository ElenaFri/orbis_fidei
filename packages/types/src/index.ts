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

export type SourceType = 'RSS' | 'ATOM' | 'API' | 'OTHER';
export type SourceStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminSource {
  id: string;
  name: string;
  url: string;
  country: string | null;
  language: Language;
  type: SourceType;
  aggregationUrl: string | null;
  fetchIntervalMin: number;
  status: SourceStatus;
  lastFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  key: string;
  labelFr: string;
  labelEn: string;
  labelRu: string;
  description: string | null;
}

export interface AdminArticleTranslation {
  id: string;
  articleId: string;
  language: Language;
  title: string;
  summary: string;
  analysis: string;
  status: string;
  isMachine: boolean;
}

export interface AdminArticle {
  id: string;
  slug: string;
  status: string;
  sourceId: string | null;
  originalLang: Language;
  authorId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  translations: AdminArticleTranslation[];
  categories: { articleId: string; categoryId: string }[];
}

export interface PublicArticleListItem extends ArticleSummary {
  sourceName?: string;
}

export interface PublicArticle extends ArticleDetail {
  sourceUrl?: string;
}

export interface PublicComment {
  id: string;
  articleId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  status: string;
  createdAt: string;
  author: { displayName: string };
  replies?: PublicComment[];
}

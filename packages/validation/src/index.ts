import { z } from 'zod';

export const LanguageSchema = z.enum(['FR', 'EN', 'RU']);
export type Language = z.infer<typeof LanguageSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  preferredLang: LanguageSchema.default('FR'),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const CommentInputSchema = z.object({
  content: z.string().min(1).max(4000),
  parentId: z.string().cuid().optional(),
});
export type CommentInput = z.infer<typeof CommentInputSchema>;

export const CommentUpdateInputSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type CommentUpdateInput = z.infer<typeof CommentUpdateInputSchema>;

export const ArticleTranslationInputSchema = z.object({
  language: LanguageSchema,
  title: z.string().min(3).max(300),
  summary: z.string().min(10).max(2000),
  analysis: z.string().min(10),
});
export type ArticleTranslationInput = z.infer<typeof ArticleTranslationInputSchema>;

export const SourceTypeSchema = z.enum(['RSS', 'ATOM', 'API', 'OTHER']);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SourceStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const SourceInputSchema = z.object({
  name: z.string().min(2).max(200),
  url: z.string().url(),
  country: z.string().max(2).optional(),
  language: LanguageSchema,
  type: SourceTypeSchema,
  aggregationUrl: z.string().url().optional(),
  fetchIntervalMin: z.number().int().positive().default(60),
  status: SourceStatusSchema.default('ACTIVE'),
});
export type SourceInput = z.infer<typeof SourceInputSchema>;

export const CategoryInputSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'lettres minuscules, chiffres et tirets uniquement'),
  labelFr: z.string().min(2).max(120),
  labelEn: z.string().min(2).max(120),
  labelRu: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function slugify(text: string): string {
  if (!text) return 'article';

  let normalized = text.toLowerCase();
  for (const [cyr, lat] of Object.entries(CYRILLIC_TO_LATIN)) {
    normalized = normalized.replaceAll(cyr, lat);
  }

  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');

  while (normalized.startsWith('-')) {
    normalized = normalized.slice(1);
  }
  while (normalized.endsWith('-')) {
    normalized = normalized.slice(0, -1);
  }

  let trimmed = normalized.slice(0, 80);
  while (trimmed.endsWith('-')) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed || 'article';
}

export const ArticleCreateInputSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'lettres minuscules, chiffres et tirets uniquement'),
  originalLang: LanguageSchema,
  sourceId: z.string().cuid().optional(),
  categoryIds: z.array(z.string().cuid()).default([]),
  translations: z.array(ArticleTranslationInputSchema).min(1),
});
export type ArticleCreateInput = z.infer<typeof ArticleCreateInputSchema>;

export const ArticleUpdateInputSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'lettres minuscules, chiffres et tirets uniquement')
    .optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
  translations: z.array(ArticleTranslationInputSchema).optional(),
});
export type ArticleUpdateInput = z.infer<typeof ArticleUpdateInputSchema>;

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
  categoryIds: z.array(z.string().cuid()).optional(),
  translations: z.array(ArticleTranslationInputSchema).optional(),
});
export type ArticleUpdateInput = z.infer<typeof ArticleUpdateInputSchema>;

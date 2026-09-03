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

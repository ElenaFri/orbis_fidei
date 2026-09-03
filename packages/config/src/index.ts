import { z } from 'zod';

export function parseEnv<T extends z.ZodTypeAny>(schema: T, source: NodeJS.ProcessEnv = process.env): z.infer<T> {
    const result = schema.safeParse(source);
    if (!result.success) {
        console.error('✗ Configuration invalide :', result.error.flatten().fieldErrors);
        throw new Error('Invalid environment configuration');
    }
    return result.data;
}

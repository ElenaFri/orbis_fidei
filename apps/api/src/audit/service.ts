import { prisma } from '@orbis-fidei/database';
import pino from 'pino';

const logger = pino({ level: 'error' });

export async function recordEditorialAction(
  input: {
    action: string;
    articleId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  },
  onError?: (error: unknown) => void,
): Promise<void> {
  try {
    await prisma.editorialAction.create({
      data: {
        action: input.action,
        articleId: input.articleId,
        userId: input.userId,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      logger.error({ error, action: input.action }, 'editorial audit write failed');
    }
  }
}

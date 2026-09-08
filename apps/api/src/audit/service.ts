import { prisma } from '@orbis-fidei/database';

export async function recordEditorialAction(input: {
  action: string;
  articleId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.editorialAction.create({
    data: {
      action: input.action,
      articleId: input.articleId,
      userId: input.userId,
      metadata: input.metadata as object | undefined,
    },
  });
}

import { prisma } from '@orbis-fidei/database';
import type { CommentInput } from '@orbis-fidei/validation';

export class CommentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'CommentError';
  }
}

const AUTHOR_SELECT = { select: { displayName: true } };

/** Lists top-level published comments for an article, each with its direct replies. */
export async function listComments(articleId: string) {
  return prisma.comment.findMany({
    where: { articleId, parentId: null, status: 'PUBLISHED' },
    include: {
      author: AUTHOR_SELECT,
      replies: {
        where: { status: 'PUBLISHED' },
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createComment(articleId: string, authorId: string, input: CommentInput) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw new CommentError('Article introuvable.', 404);

  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.articleId !== articleId) {
      throw new CommentError('Commentaire parent introuvable.', 404);
    }
  }

  return prisma.comment.create({
    data: {
      articleId,
      authorId,
      content: input.content,
      parentId: input.parentId,
    },
    include: { author: AUTHOR_SELECT },
  });
}

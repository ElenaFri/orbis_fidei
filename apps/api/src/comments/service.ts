import { prisma } from '@orbis-fidei/database';
import type { CommentInput, CommentUpdateInput } from '@orbis-fidei/validation';

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

export interface CommentNode {
  id: string;
  articleId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  status: string;
  createdAt: Date;
  author: { displayName: string };
  replies: CommentNode[];
}

/** Lists top-level published comments for an article, each with its full tree of replies. */
export async function listComments(articleId: string): Promise<CommentNode[]> {
  const flatComments = await prisma.comment.findMany({
    where: { articleId, status: 'PUBLISHED' },
    include: { author: AUTHOR_SELECT },
    orderBy: { createdAt: 'asc' },
  });

  const nodeMap = new Map<string, CommentNode>();
  for (const c of flatComments) {
    nodeMap.set(c.id, {
      ...c,
      replies: [],
    });
  }

  const roots: CommentNode[] = [];
  for (const c of flatComments) {
    const node = nodeMap.get(c.id)!;
    if (c.parentId && nodeMap.has(c.parentId)) {
      nodeMap.get(c.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots.reverse();
}

export async function createComment(articleId: string, authorId: string, input: CommentInput) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw new CommentError('Article introuvable.', 404);

  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId } });
    if (parent?.articleId !== articleId) {
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

export async function updateComment(commentId: string, userId: string, input: CommentUpdateInput) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new CommentError('Commentaire introuvable.', 404);

  if (comment.authorId !== userId) {
    throw new CommentError('Action non autorisée.', 403);
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { content: input.content },
    include: { author: AUTHOR_SELECT },
  });
}

async function deleteCommentAndDescendants(commentId: string): Promise<void> {
  const children = await prisma.comment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  });
  for (const child of children) {
    await deleteCommentAndDescendants(child.id);
  }
  await prisma.comment.delete({ where: { id: commentId } });
}

export async function deleteComment(commentId: string, userId: string, canModerate: boolean) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new CommentError('Commentaire introuvable.', 404);

  if (comment.authorId !== userId && !canModerate) {
    throw new CommentError('Permission insuffisante.', 403);
  }

  await deleteCommentAndDescendants(commentId);
}

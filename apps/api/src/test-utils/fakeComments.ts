import { vi } from 'vitest';

export interface FakeCommentRecord {
  id: string;
  articleId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  status: string;
  createdAt: Date;
  author: { displayName: string };
}

export function createFakeCommentPrisma(
  articles: Map<string, { id: string }>,
  comments: Map<string, FakeCommentRecord>,
  nextId: () => string,
  includeReplies: boolean,
) {
  return {
    article: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => articles.get(where.id) ?? null,
      ),
    },
    comment: {
      findMany: vi.fn(async ({ where }: { where: { articleId: string; parentId: null } }) =>
        [...comments.values()]
          .filter((comment) => comment.articleId === where.articleId && comment.parentId === null)
          .map((comment) => ({
            ...comment,
            replies: includeReplies
              ? [...comments.values()].filter((reply) => reply.parentId === comment.id)
              : [],
          })),
      ),
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => comments.get(where.id) ?? null,
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { articleId: string; authorId: string; content: string; parentId?: string };
        }) => {
          const comment: FakeCommentRecord = {
            id: nextId(),
            articleId: data.articleId,
            authorId: data.authorId,
            parentId: data.parentId ?? null,
            content: data.content,
            status: 'PUBLISHED',
            createdAt: new Date(),
            author: { displayName: 'Jane Doe' },
          };
          comments.set(comment.id, comment);
          return comment;
        },
      ),
    },
  };
}

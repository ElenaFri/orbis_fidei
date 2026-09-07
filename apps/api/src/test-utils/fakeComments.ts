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
  _includeReplies = true,
) {
  return {
    article: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => articles.get(where.id) ?? null,
      ),
    },
    comment: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where?: {
            articleId?: string;
            parentId?: string | null;
            status?: string;
          };
        } = {}) => {
          let list = [...comments.values()];
          if (where?.articleId) {
            list = list.filter((c) => c.articleId === where.articleId);
          }
          if (where?.parentId !== undefined) {
            list = list.filter((c) => c.parentId === where.parentId);
          }
          if (where?.status) {
            list = list.filter((c) => c.status === where.status);
          }
          return list;
        },
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
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeCommentRecord> }) => {
          const comment = comments.get(where.id);
          if (!comment) throw new Error('not found');
          Object.assign(comment, data);
          return comment;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        comments.delete(where.id);
      }),
      deleteMany: vi.fn(async ({ where }: { where: { parentId: string } }) => {
        for (const [id, c] of comments.entries()) {
          if (c.parentId === where.parentId) {
            comments.delete(id);
          }
        }
      }),
    },
  };
}

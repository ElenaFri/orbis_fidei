import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFakeCommentPrisma, type FakeCommentRecord } from '../test-utils/fakeComments.js';

interface FakeArticle {
  id: string;
}

const articles = new Map<string, FakeArticle>();
const comments = new Map<string, FakeCommentRecord>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: createFakeCommentPrisma(articles, comments, () => `comment_${nextId++}`, true),
}));

const service = await import('./service.js');

describe('comments service', () => {
  afterEach(() => {
    articles.clear();
    comments.clear();
  });

  it('lists top-level comments with their replies', async () => {
    articles.set('article_1', { id: 'article_1' });
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Bel article.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });
    comments.set('comment_2', {
      id: 'comment_2',
      articleId: 'article_1',
      authorId: 'user_2',
      parentId: 'comment_1',
      content: "Tout à fait d'accord.",
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'John Smith' },
    });

    const list = await service.listComments('article_1');
    expect(list).toHaveLength(1);
    expect(list[0]?.replies).toHaveLength(1);
  });

  it('lists deeply nested replies in hierarchical tree structure', async () => {
    articles.set('article_1', { id: 'article_1' });
    comments.set('root_1', {
      id: 'root_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Root comment',
      status: 'PUBLISHED',
      createdAt: new Date('2026-09-01T10:00:00Z'),
      author: { displayName: 'User 1' },
    });
    comments.set('reply_1', {
      id: 'reply_1',
      articleId: 'article_1',
      authorId: 'user_2',
      parentId: 'root_1',
      content: 'First level reply',
      status: 'PUBLISHED',
      createdAt: new Date('2026-09-01T11:00:00Z'),
      author: { displayName: 'User 2' },
    });
    comments.set('reply_2', {
      id: 'reply_2',
      articleId: 'article_1',
      authorId: 'user_3',
      parentId: 'reply_1',
      content: 'Nested reply to reply 1',
      status: 'PUBLISHED',
      createdAt: new Date('2026-09-01T12:00:00Z'),
      author: { displayName: 'User 3' },
    });

    const list = await service.listComments('article_1');
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('root_1');
    expect(list[0]?.replies).toHaveLength(1);
    expect(list[0]?.replies[0]?.id).toBe('reply_1');
    expect(list[0]?.replies[0]?.replies).toHaveLength(1);
    expect(list[0]?.replies[0]?.replies[0]?.id).toBe('reply_2');
  });

  it('creates a top-level comment', async () => {
    articles.set('article_1', { id: 'article_1' });
    const created = await service.createComment('article_1', 'user_1', { content: 'Bel article.' });
    expect(created.content).toBe('Bel article.');
    expect(created.parentId).toBeNull();
  });

  it('rejects a comment on an unknown article', async () => {
    await expect(
      service.createComment('unknown', 'user_1', { content: 'Bel article.' }),
    ).rejects.toThrow(service.CommentError);
  });

  it('rejects a reply to an unknown parent comment', async () => {
    articles.set('article_1', { id: 'article_1' });
    await expect(
      service.createComment('article_1', 'user_1', { content: 'Réponse', parentId: 'unknown' }),
    ).rejects.toThrow(service.CommentError);
  });

  it('rejects a reply pointing to a comment on a different article', async () => {
    articles.set('article_1', { id: 'article_1' });
    articles.set('article_2', { id: 'article_2' });
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_2',
      authorId: 'user_1',
      parentId: null,
      content: 'Bel article.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    await expect(
      service.createComment('article_1', 'user_1', { content: 'Réponse', parentId: 'comment_1' }),
    ).rejects.toThrow(service.CommentError);
  });

  it('updates a comment by its author', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Contenu original.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    const updated = await service.updateComment('comment_1', 'user_1', {
      content: 'Contenu modifié.',
    });
    expect(updated.content).toBe('Contenu modifié.');
  });

  it('rejects updating an unknown comment', async () => {
    await expect(
      service.updateComment('unknown', 'user_1', { content: 'Modifié.' }),
    ).rejects.toThrow(service.CommentError);
  });

  it("rejects updating someone else's comment", async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Contenu original.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    await expect(
      service.updateComment('comment_1', 'user_2', { content: 'Piratage.' }),
    ).rejects.toThrow(service.CommentError);
  });

  it('deletes a comment by its author', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'À supprimer.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    await service.deleteComment('comment_1', 'user_1', false);
    expect(comments.has('comment_1')).toBe(false);
  });

  it('allows a moderator to delete any comment and cleans up replies', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Commentaire parent.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });
    comments.set('comment_2', {
      id: 'comment_2',
      articleId: 'article_1',
      authorId: 'user_2',
      parentId: 'comment_1',
      content: 'Réponse.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'John Smith' },
    });

    await service.deleteComment('comment_1', 'moderator_user', true);
    expect(comments.has('comment_1')).toBe(false);
    expect(comments.has('comment_2')).toBe(false);
  });

  it('rejects deletion when not author and cannot moderate', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Commentaire.',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    await expect(service.deleteComment('comment_1', 'user_2', false)).rejects.toThrow(
      service.CommentError,
    );
  });

  it('rejects deleting an unknown comment', async () => {
    await expect(service.deleteComment('unknown', 'user_1', false)).rejects.toThrow(
      service.CommentError,
    );
  });
});

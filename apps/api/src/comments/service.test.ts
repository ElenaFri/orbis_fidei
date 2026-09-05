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
});

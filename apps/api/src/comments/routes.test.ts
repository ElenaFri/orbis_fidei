import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFakeCommentPrisma, type FakeCommentRecord } from '../test-utils/fakeComments.js';

interface FakeArticle {
  id: string;
}

const articles = new Map<string, FakeArticle>();
const comments = new Map<string, FakeCommentRecord>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: createFakeCommentPrisma(articles, comments, () => `comment_${nextId++}`, false),
}));

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();
const { default: authPlugin } = await import('../auth/plugin.js');
const { signAccessToken } = await import('../auth/tokens.js');
const { registerCommentRoutes } = await import('./routes.js');

async function buildTestApp() {
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(registerCommentRoutes);
  return app;
}

function token(userId = 'user_1', permissions: string[] = []): string {
  return signAccessToken({ sub: userId, email: `${userId}@b.com`, permissions });
}

describe('comment routes', () => {
  afterEach(() => {
    articles.clear();
    comments.clear();
  });

  it('lists comments without authentication', async () => {
    articles.set('article_1', { id: 'article_1' });
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/articles/article_1/comments' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('rejects posting a comment without authentication', async () => {
    articles.set('article_1', { id: 'article_1' });
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/articles/article_1/comments',
      payload: { content: 'Bel article.' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('posts a comment when authenticated', async () => {
    articles.set('article_1', { id: 'article_1' });
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/articles/article_1/comments',
      headers: { authorization: `Bearer ${token()}` },
      payload: { content: 'Bel article.' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().content).toBe('Bel article.');
  });

  it('rejects an invalid comment body', async () => {
    articles.set('article_1', { id: 'article_1' });
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/articles/article_1/comments',
      headers: { authorization: `Bearer ${token()}` },
      payload: { content: '' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 404 when posting a comment on an unknown article', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/articles/unknown/comments',
      headers: { authorization: `Bearer ${token()}` },
      payload: { content: 'Bel article.' },
    });
    expect(response.statusCode).toBe(404);
  });

  it('rejects updating comment without authentication', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/comments/comment_1',
      payload: { content: 'Modifié.' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects updating with invalid body', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/comments/comment_1',
      headers: { authorization: `Bearer ${token()}` },
      payload: { content: '' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('updates a comment when author', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Original',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/comments/comment_1',
      headers: { authorization: `Bearer ${token('user_1')}` },
      payload: { content: 'Modifié.' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().content).toBe('Modifié.');
  });

  it('rejects deleting comment without authentication', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/comments/comment_1',
    });
    expect(response.statusCode).toBe(401);
  });

  it('deletes a comment when author', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'À supprimer',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/comments/comment_1',
      headers: { authorization: `Bearer ${token('user_1')}` },
    });
    expect(response.statusCode).toBe(204);
  });

  it('deletes a comment when moderator', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'À modérer',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/comments/comment_1',
      headers: { authorization: `Bearer ${token('moderator_user', ['comment.moderate'])}` },
    });
    expect(response.statusCode).toBe(204);
  });

  it('rejects deletion when neither author nor moderator', async () => {
    comments.set('comment_1', {
      id: 'comment_1',
      articleId: 'article_1',
      authorId: 'user_1',
      parentId: null,
      content: 'Commentaire',
      status: 'PUBLISHED',
      createdAt: new Date(),
      author: { displayName: 'Jane Doe' },
    });

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/comments/comment_1',
      headers: { authorization: `Bearer ${token('user_2')}` },
    });
    expect(response.statusCode).toBe(403);
  });
});

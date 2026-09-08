import { describe, expect, it, vi } from 'vitest';

const create = vi.fn(async () => undefined);

vi.mock('@orbis-fidei/database', () => ({
  prisma: { editorialAction: { create } },
}));

const { recordEditorialAction } = await import('./service.js');

describe('recordEditorialAction', () => {
  it('persists the action and optional context', async () => {
    await recordEditorialAction({
      action: 'ARTICLE_PUBLISHED',
      articleId: 'article_1',
      userId: 'user_1',
      metadata: { source: 'moderation' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        action: 'ARTICLE_PUBLISHED',
        articleId: 'article_1',
        userId: 'user_1',
        metadata: { source: 'moderation' },
      },
    });
  });

  it('supports action-only records', async () => {
    create.mockClear();
    await recordEditorialAction({ action: 'SYSTEM_CHECK' });

    expect(create).toHaveBeenCalledWith({
      data: {
        action: 'SYSTEM_CHECK',
        articleId: undefined,
        userId: undefined,
        metadata: undefined,
      },
    });
  });
});

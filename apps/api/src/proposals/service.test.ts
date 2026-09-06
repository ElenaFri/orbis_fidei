import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeProposal {
  id: string;
  sourceItemId: string;
  status: string;
  suggestedTitle: string;
  suggestedSummary: string;
  suggestedCategory: string;
  confidence: number;
  reviewedById: string | null;
  reviewedAt: Date | null;
  sourceItem: {
    id: string;
    sourceId: string;
    originalTitle: string;
    originalContent: string;
    originalLanguage: string;
    source: { name: string; url: string };
  };
  article: null;
}

const proposals = new Map<string, FakeProposal>();
const articles: Array<{ id: string; status?: string; translations: Array<{ title: string }> }> = [];

vi.mock('@orbis-fidei/database', () => {
  const prisma = {
    articleProposal: {
      findMany: vi.fn(async () => [...proposals.values()]),
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => proposals.get(where.id) ?? null,
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeProposal> }) => {
          const proposal = proposals.get(where.id);
          if (!proposal) throw new Error('not found');
          Object.assign(proposal, data);
          return proposal;
        },
      ),
    },
    article: {
      create: vi.fn(async ({ data }: { data: { translations: { create: { title: string } } } }) => {
        const article = {
          id: `article_${articles.length + 1}`,
          ...data,
          translations: [data.translations.create],
        };
        articles.push(article);
        return article;
      }),
    },
  };
  return {
    prisma: {
      ...prisma,
      $transaction: async (callback: (transaction: typeof prisma) => unknown) => callback(prisma),
    },
  };
});

const service = await import('./service.js');

function seedProposal(overrides: Record<string, unknown> = {}) {
  const proposal = {
    id: 'proposal_1',
    sourceItemId: 'item_1',
    status: 'PENDING',
    suggestedTitle: 'Suggested title',
    suggestedSummary: 'Suggested summary',
    suggestedCategory: 'other',
    confidence: 0.8,
    reviewedById: null,
    reviewedAt: null,
    sourceItem: {
      id: 'item_1',
      sourceId: 'source_1',
      originalTitle: 'Original title',
      originalContent: 'Original content',
      originalLanguage: 'FR',
      source: { name: 'Source', url: 'https://example.com' },
    },
    article: null,
    ...overrides,
  };
  proposals.set(proposal.id, proposal);
  return proposal;
}

describe('proposal moderation service', () => {
  afterEach(() => {
    proposals.clear();
    articles.length = 0;
  });

  it('lists pending proposals', async () => {
    seedProposal();
    await expect(service.listPendingProposals()).resolves.toHaveLength(1);
  });

  it('accepts a proposal and creates a draft article', async () => {
    seedProposal();
    const article = await service.acceptProposal('proposal_1', 'reviewer_1');
    expect(article.id).toBe('article_1');
    expect(article.translations[0]!.title).toBe('Suggested title');
    expect(proposals.get('proposal_1')!.status).toBe('ACCEPTED');
  });

  it('rejects a pending proposal', async () => {
    seedProposal();
    const rejected = await service.rejectProposal('proposal_1', 'reviewer_1');
    expect(rejected.status).toBe('REJECTED');
  });

  it('rejects missing and already reviewed proposals', async () => {
    await expect(service.getProposal('unknown')).rejects.toThrow('introuvable');
    seedProposal({ status: 'ACCEPTED' });
    await expect(service.rejectProposal('proposal_1', 'reviewer_1')).rejects.toThrow(
      'déjà été traitée',
    );
  });
});

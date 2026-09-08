import { describe, expect, it, vi } from 'vitest';

import {
  analyzePendingSourceItems,
  analyzeSourceItem,
  type AIProvider,
  type AnalyzerDependencies,
} from './analyzer.js';
import { FakeAIProvider } from './providers.js';

function createDependencies(overrides: Record<string, unknown> = {}) {
  const proposals: Array<{ id: string; sourceItemId: string }> = [];
  const items = new Map([
    [
      'item_1',
      {
        id: 'item_1',
        originalTitle: 'Title',
        originalContent: 'A sufficiently long source content.',
        originalLanguage: 'FR' as const,
      },
    ],
    [
      'item_2',
      {
        id: 'item_2',
        originalTitle: 'Second title',
        originalContent: 'Second source content.',
        originalLanguage: 'EN' as const,
      },
    ],
  ]);
  let proposalNumber = 1;
  const prisma = {
    sourceItem: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => items.get(where.id) ?? null,
      ),
      findMany: vi.fn(async () => [...items.values()]),
    },
    articleProposal: {
      findFirst: vi.fn(
        async ({ where }: { where: { sourceItemId: string } }) =>
          proposals.find((proposal) => proposal.sourceItemId === where.sourceItemId) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const proposal = {
          id: `proposal_${proposalNumber++}`,
          sourceItemId: data.sourceItemId as string,
        };
        proposals.push(proposal);
        return proposal;
      }),
    },
  };
  return { prisma, proposals, items, ...overrides };
}

describe('analyzeSourceItem', () => {
  it('creates an ArticleProposal through the fake provider', async () => {
    const dependencies = createDependencies({ provider: new FakeAIProvider() });
    const result = await analyzeSourceItem(
      'item_1',
      dependencies as unknown as AnalyzerDependencies,
    );

    expect(result).toEqual({ proposalId: 'proposal_1', created: true });
    expect(dependencies.proposals).toHaveLength(1);
    expect(dependencies.prisma.articleProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ suggestedTitle: 'Title', suggestedCategory: 'other' }),
      }),
    );
  });

  it('is idempotent when a proposal already exists', async () => {
    const dependencies = createDependencies({ provider: new FakeAIProvider() });
    await analyzeSourceItem('item_1', dependencies as unknown as AnalyzerDependencies);
    const result = await analyzeSourceItem(
      'item_1',
      dependencies as unknown as AnalyzerDependencies,
    );

    expect(result).toEqual({ proposalId: 'proposal_1', created: false });
    expect(dependencies.prisma.articleProposal.create).toHaveBeenCalledTimes(1);
  });

  it('retries provider failures up to the configured limit', async () => {
    const provider: AIProvider = {
      analyze: vi.fn().mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce({
        language: 'FR',
        suggestedTitle: 'Title',
        suggestedSummary: 'Summary',
        suggestedCategory: 'other',
        confidence: 0.8,
        importanceScore: 0.7,
        importanceLevel: 'HIGH',
        importanceReason: 'International public-interest event.',
      }),
    };
    const dependencies = createDependencies({ provider, maxAttempts: 2 });

    const result = await analyzeSourceItem(
      'item_1',
      dependencies as unknown as AnalyzerDependencies,
    );

    expect(result.created).toBe(true);
    expect(provider.analyze).toHaveBeenCalledTimes(2);
  });

  it('fails clearly when the source item does not exist', async () => {
    const dependencies = createDependencies({ provider: new FakeAIProvider() });
    await expect(
      analyzeSourceItem('unknown', dependencies as unknown as AnalyzerDependencies),
    ).rejects.toThrow('Source item not found');
  });

  it('fails after exhausting provider retries', async () => {
    const provider: AIProvider = { analyze: vi.fn().mockRejectedValue(new Error('provider down')) };
    const dependencies = createDependencies({ provider, maxAttempts: 2 });

    await expect(
      analyzeSourceItem('item_1', dependencies as unknown as AnalyzerDependencies),
    ).rejects.toThrow('2 attempt(s)');
    expect(provider.analyze).toHaveBeenCalledTimes(2);
  });
});

describe('analyzePendingSourceItems', () => {
  it('analyzes every pending source item', async () => {
    const dependencies = createDependencies({ provider: new FakeAIProvider() });
    const results = await analyzePendingSourceItems(
      dependencies as unknown as AnalyzerDependencies,
    );

    expect(results).toHaveLength(2);
    expect(dependencies.prisma.sourceItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { proposals: { none: {} } } }),
    );
  });
});

import { describe, expect, it, vi } from 'vitest';

import {
  aggregateActiveSources,
  aggregateSource,
  hashContent,
  parseDate,
  type AggregatorDependencies,
  type AggregatorSource,
} from './aggregator.js';

function createDependencies(overrides: Partial<AggregatorDependencies> = {}) {
  const jobs: Array<Record<string, unknown>> = [];
  const items: Array<Record<string, unknown>> = [];
  const queued: Array<{ name: string; data: { sourceItemId: string } }> = [];
  let itemId = 1;

  const dependencies: AggregatorDependencies = {
    prisma: {
      aggregationJob: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          jobs.push({ id: 'job_1', ...data });
          return { id: 'job_1' };
        }),
        update: vi.fn(async () => undefined),
      },
      sourceItem: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const result = { id: `item_${itemId++}`, ...data };
          items.push(result);
          return { id: result.id };
        }),
      },
      source: {
        findMany: vi.fn(async () => []),
        update: vi.fn(async () => undefined),
      },
    } as unknown as AggregatorDependencies['prisma'],
    analysisQueue: {
      add: vi.fn(async (name: string, data: { sourceItemId: string }) => {
        queued.push({ name, data });
      }),
    },
    fetcher: vi.fn(async () => new Response('', { status: 200 }) as unknown as Response),
    ...overrides,
  };

  return { dependencies, jobs, items, queued };
}

const source: AggregatorSource = {
  id: 'source_1',
  name: 'Example',
  url: 'https://example.com/feed.xml',
  aggregationUrl: null,
  language: 'FR',
  status: 'ACTIVE',
  lastFetchedAt: null,
};

describe('aggregator helpers', () => {
  it('hashes content deterministically', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
    expect(hashContent('hello')).not.toBe(hashContent('world'));
  });

  it('parses valid dates and rejects invalid dates', () => {
    expect(parseDate('2026-09-05T12:00:00Z')).toBeInstanceOf(Date);
    expect(parseDate('invalid')).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });
});

describe('aggregateSource', () => {
  it('imports feed items, deduplicates them, and queues analysis', async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><item><title>News</title><link>https://example.com/news</link><description>Summary</description><pubDate>Sat, 05 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
    const { dependencies, items, queued } = createDependencies({
      fetcher: vi.fn(async () => new Response(xml, { status: 200 }) as unknown as Response),
    });

    const result = await aggregateSource(source, dependencies);

    expect(result).toMatchObject({ status: 'COMPLETED', itemsFound: 1, itemsNew: 1 });
    expect(items[0]).toMatchObject({
      originalUrl: 'https://example.com/news',
      originalTitle: 'News',
    });
    expect(queued).toEqual([{ name: 'analysis', data: { sourceItemId: 'item_1' } }]);
  });

  it('does not reinsert an existing item', async () => {
    const xml =
      '<rss version="2.0"><channel><item><title>News</title><link>https://example.com/news</link></item></channel></rss>';
    const { dependencies, items, queued } = createDependencies({
      fetcher: vi.fn(async () => new Response(xml, { status: 200 }) as unknown as Response),
    });
    vi.mocked(dependencies.prisma.sourceItem.findFirst).mockResolvedValue({
      id: 'existing',
    } as never);

    const result = await aggregateSource(source, dependencies);

    expect(result.itemsNew).toBe(0);
    expect(items).toHaveLength(0);
    expect(queued).toHaveLength(0);
  });

  it('handles not-modified feeds without parsing or inserting items', async () => {
    const { dependencies, items } = createDependencies({
      fetcher: vi.fn(async () => new Response(null, { status: 304 }) as unknown as Response),
    });

    const result = await aggregateSource({ ...source, lastFetchedAt: new Date() }, dependencies);

    expect(result).toMatchObject({ status: 'COMPLETED', itemsFound: 0, itemsNew: 0 });
    expect(items).toHaveLength(0);
  });

  it('records a failed job when the source returns an error', async () => {
    const { dependencies, jobs } = createDependencies({
      fetcher: vi.fn(async () => new Response(null, { status: 503 }) as unknown as Response),
    });

    const result = await aggregateSource(source, dependencies);

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('HTTP 503');
    expect(jobs[0]?.status).toBe('RUNNING');
    expect(dependencies.prisma.aggregationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('uses the default fetcher when no custom fetcher is provided', async () => {
    const xml =
      '<rss version="2.0"><channel><item><title>News</title><link>https://example.com/news</link></item></channel></rss>';
    const fetchMock = vi.fn(async () => new Response(xml, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { dependencies } = createDependencies();
    delete dependencies.fetcher;

    const result = await aggregateSource(source, dependencies);

    expect(result.status).toBe('COMPLETED');
    expect(fetchMock).toHaveBeenCalledWith(
      source.url,
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });
});

describe('aggregateActiveSources', () => {
  it('aggregates each active source returned by Prisma', async () => {
    const secondSource = { ...source, id: 'source_2', url: 'https://example.com/other.xml' };
    let fetchCount = 0;
    const fetcher = vi.fn(async () => {
      fetchCount += 1;
      const link = `https://example.com/news-${fetchCount}`;
      const xml = `<rss version="2.0"><channel><item><title>News ${fetchCount}</title><link>${link}</link></item></channel></rss>`;
      return new Response(xml, { status: 200 }) as unknown as Response;
    });
    const { dependencies } = createDependencies({
      fetcher,
    });
    vi.mocked(dependencies.prisma.source.findMany).mockResolvedValue([
      source,
      secondSource,
    ] as never);

    const results = await aggregateActiveSources(dependencies);

    expect(results).toHaveLength(2);
    expect(dependencies.prisma.source.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { lastFetchedAt: 'asc' },
    });
  });
});

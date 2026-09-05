import { createHash } from 'node:crypto';

import type { PrismaClient } from '@orbis-fidei/database';
import { QUEUES } from '@orbis-fidei/queue';
import Parser from 'rss-parser';

export interface AggregatorSource {
  id: string;
  name: string;
  url: string;
  aggregationUrl: string | null;
  language: 'FR' | 'EN' | 'RU';
  status: 'ACTIVE' | 'INACTIVE';
  lastFetchedAt: Date | null;
}

export interface AggregationResult {
  sourceId: string;
  status: 'COMPLETED' | 'FAILED';
  itemsFound: number;
  itemsNew: number;
  jobId?: string;
  error?: string;
}

export interface AnalysisQueue {
  add(name: string, data: { sourceItemId: string }): Promise<unknown>;
}

export interface FetchResponse {
  status: number;
  headers: Headers;
  text(): Promise<string>;
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<FetchResponse>;

export interface AggregatorDependencies {
  prisma: PrismaClient;
  analysisQueue: AnalysisQueue;
  fetcher?: Fetcher;
  parser?: Parser;
  now?: () => Date;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function defaultFetcher(input: string, init?: RequestInit): Promise<FetchResponse> {
  return fetch(input, init);
}

function buildConditionalHeaders(source: AggregatorSource): Headers {
  const headers = new Headers({
    accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  });
  if (source.lastFetchedAt) {
    headers.set('if-modified-since', source.lastFetchedAt.toUTCString());
  }
  return headers;
}

async function fetchFeed(
  source: AggregatorSource,
  fetcher: Fetcher,
): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetcher(source.aggregationUrl || source.url, {
      headers: buildConditionalHeaders(source),
      signal: controller.signal,
    });
    return { status: response.status, body: response.status === 304 ? '' : await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

export async function aggregateSource(
  source: AggregatorSource,
  dependencies: AggregatorDependencies,
): Promise<AggregationResult> {
  const now = dependencies.now ?? (() => new Date());
  const fetcher = dependencies.fetcher ?? defaultFetcher;
  const parser = dependencies.parser ?? new Parser();
  let job: { id: string } | undefined;
  let itemsFound = 0;
  let itemsNew = 0;

  try {
    job = await dependencies.prisma.aggregationJob.create({
      data: { sourceId: source.id, status: 'RUNNING' },
      select: { id: true },
    });

    const feed = await fetchFeed(source, fetcher);
    if (feed.status === 304) {
      await dependencies.prisma.aggregationJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', finishedAt: now() },
      });
      await dependencies.prisma.source.update({
        where: { id: source.id },
        data: { lastFetchedAt: now() },
      });
      return {
        sourceId: source.id,
        status: 'COMPLETED',
        itemsFound: 0,
        itemsNew: 0,
        jobId: job.id,
      };
    }

    if (feed.status < 200 || feed.status >= 300) {
      throw new Error(`Source returned HTTP ${feed.status}`);
    }

    const parsed = await parser.parseString(feed.body);
    itemsFound = parsed.items.length;

    for (const item of parsed.items) {
      const originalUrl = item.link?.trim();
      if (!originalUrl || !item.title?.trim()) continue;

      const originalContent = (item.contentSnippet || item.content || item.summary || '').trim();
      const contentHash = hashContent(`${item.title.trim()}\n${originalContent}`);
      const existing = await dependencies.prisma.sourceItem.findFirst({
        where: { OR: [{ originalUrl }, { contentHash }] },
        select: { id: true },
      });
      if (existing) continue;

      const sourceItem = await dependencies.prisma.sourceItem.create({
        data: {
          sourceId: source.id,
          originalUrl,
          originalTitle: item.title.trim(),
          originalContent,
          originalLanguage: source.language,
          publishedAt: parseDate(item.isoDate || item.pubDate),
          contentHash,
          rawData: item as unknown as object,
        },
        select: { id: true },
      });
      itemsNew += 1;
      await dependencies.analysisQueue.add(QUEUES.ANALYSIS, { sourceItemId: sourceItem.id });
    }

    await dependencies.prisma.aggregationJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', finishedAt: now(), itemsFound, itemsNew },
    });
    await dependencies.prisma.source.update({
      where: { id: source.id },
      data: { lastFetchedAt: now() },
    });

    return { sourceId: source.id, status: 'COMPLETED', itemsFound, itemsNew, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown aggregation error';
    if (job) {
      await dependencies.prisma.aggregationJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', finishedAt: now(), itemsFound, itemsNew, error: message },
      });
    }
    return {
      sourceId: source.id,
      status: 'FAILED',
      itemsFound,
      itemsNew,
      jobId: job?.id,
      error: message,
    };
  }
}

export async function aggregateActiveSources(
  dependencies: AggregatorDependencies,
): Promise<AggregationResult[]> {
  const sources = await dependencies.prisma.source.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { lastFetchedAt: 'asc' },
  });
  return Promise.all(sources.map((source) => aggregateSource(source, dependencies)));
}

export { hashContent, parseDate };

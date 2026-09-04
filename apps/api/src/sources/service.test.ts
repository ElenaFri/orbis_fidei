import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeSource {
  id: string;
  name: string;
  url: string;
  language: string;
  type: string;
  fetchIntervalMin: number;
  status: string;
}

const sources = new Map<string, FakeSource>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    source: {
      findMany: vi.fn(async () => [...sources.values()]),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; url?: string } }) => {
        if (where.id) return sources.get(where.id) ?? null;
        if (where.url) return [...sources.values()].find((s) => s.url === where.url) ?? null;
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<FakeSource, 'id'> }) => {
        const source: FakeSource = { id: `source_${nextId++}`, ...data };
        sources.set(source.id, source);
        return source;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeSource> }) => {
          const source = sources.get(where.id);
          if (!source) throw new Error('not found');
          Object.assign(source, data);
          return source;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        sources.delete(where.id);
      }),
    },
  },
}));

const service = await import('./service.js');

function seedSource(overrides: Partial<FakeSource> = {}): FakeSource {
  const source: FakeSource = {
    id: `source_${nextId++}`,
    name: 'Radio Notre-Dame',
    url: `https://example.com/${nextId}`,
    language: 'FR',
    type: 'RSS',
    fetchIntervalMin: 60,
    status: 'ACTIVE',
    ...overrides,
  };
  sources.set(source.id, source);
  return source;
}

describe('sources service', () => {
  afterEach(() => sources.clear());

  it('liste les sources existantes', async () => {
    seedSource();
    await expect(service.listSources()).resolves.toHaveLength(1);
  });

  it('crée une source', async () => {
    const created = await service.createSource({
      name: 'KTO',
      url: 'https://kto.com/rss',
      language: 'FR',
      type: 'RSS',
      fetchIntervalMin: 60,
      status: 'ACTIVE',
    });
    expect(created.name).toBe('KTO');
  });

  it('refuse de créer une source avec une URL déjà utilisée', async () => {
    const existing = seedSource();
    await expect(
      service.createSource({
        name: 'Doublon',
        url: existing.url,
        language: 'FR',
        type: 'RSS',
        fetchIntervalMin: 60,
        status: 'ACTIVE',
      }),
    ).rejects.toThrow(service.SourceError);
  });

  it('lève une erreur 404 pour une source introuvable', async () => {
    await expect(service.getSource('unknown')).rejects.toThrow(service.SourceError);
  });

  it('met à jour une source existante', async () => {
    const source = seedSource();
    const updated = await service.updateSource(source.id, { name: 'Nouveau nom' });
    expect(updated.name).toBe('Nouveau nom');
  });

  it('supprime une source existante', async () => {
    const source = seedSource();
    await service.deleteSource(source.id);
    await expect(service.getSource(source.id)).rejects.toThrow(service.SourceError);
  });
});

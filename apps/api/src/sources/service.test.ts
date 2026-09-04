import { expect, vi } from 'vitest';

import { createFakeCrud } from '../test-utils/fakeCrud.js';
import { describeCrudService } from '../test-utils/crudServiceSuite.js';

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
  prisma: { source: createFakeCrud<FakeSource>(sources, () => `source_${nextId++}`, 'url') },
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

describeCrudService<FakeSource>({
  entityName: 'source',
  list: service.listSources,
  create: (input) => service.createSource(input as never),
  get: service.getSource,
  update: (id, patch) => service.updateSource(id, patch as never),
  remove: service.deleteSource,
  ErrorClass: service.SourceError,
  seed: seedSource,
  resetStore: () => sources.clear(),
  validCreateInput: {
    name: 'KTO',
    url: 'https://kto.com/rss',
    language: 'FR',
    type: 'RSS',
    fetchIntervalMin: 60,
    status: 'ACTIVE',
  },
  buildConflictingInput: (existing) => ({
    name: 'Duplicate',
    url: existing.url,
    language: 'FR',
    type: 'RSS',
    fetchIntervalMin: 60,
    status: 'ACTIVE',
  }),
  updatePatch: { name: 'New name' },
  assertCreated: (created) => expect(created.name).toBe('KTO'),
  assertUpdated: (updated) => expect(updated.name).toBe('New name'),
});

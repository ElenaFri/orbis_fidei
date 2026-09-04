import { vi } from 'vitest';

import { buildAdminTestApp } from '../test-utils/testApp.js';
import { describeCrudRoutes } from '../test-utils/crudRouteSuite.js';
import { createFakeCrud } from '../test-utils/fakeCrud.js';

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

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();
const { registerSourceRoutes } = await import('./routes.js');

describeCrudRoutes({
  entityName: 'source',
  basePath: '/admin/sources',
  permission: 'source.manage',
  buildTestApp: () => buildAdminTestApp(registerSourceRoutes),
  resetStore: () => sources.clear(),
  validPayload: { name: 'KTO', url: 'https://kto.com/rss', language: 'FR', type: 'RSS' },
  invalidCreatePayload: { name: 'KTO' },
  updateField: 'name',
  updateValue: 'KTO TV',
  invalidPatchPayload: { type: 'INVALID_TYPE' },
});

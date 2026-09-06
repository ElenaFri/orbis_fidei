import { vi } from 'vitest';

import { buildAdminTestApp } from '../test-utils/testApp.js';
import { describeCrudRoutes } from '../test-utils/crudRouteSuite.js';
import { createFakeCrud } from '../test-utils/fakeCrud.js';

interface FakeCategory {
  id: string;
  key: string;
  labelFr: string;
  labelEn: string;
  labelRu: string;
}

const categories = new Map<string, FakeCategory>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    category: createFakeCrud<FakeCategory>(categories, () => `category_${nextId++}`, 'key'),
    articleCategory: { count: vi.fn(async () => 0) },
  },
}));

import { setTestEnv } from '../test-utils/env.js';

setTestEnv();
const { registerCategoryRoutes } = await import('./routes.js');

describeCrudRoutes({
  entityName: 'category',
  basePath: '/admin/categories',
  permission: 'category.manage',
  buildTestApp: () => buildAdminTestApp(registerCategoryRoutes),
  resetStore: () => categories.clear(),
  validPayload: {
    key: 'theology',
    labelFr: 'Théologie',
    labelEn: 'Theology',
    labelRu: 'Богословие',
  },
  invalidCreatePayload: { key: 'Invalid Key' },
  updateField: 'labelFr',
  updateValue: 'Nouveau libellé',
  invalidPatchPayload: { key: 'Invalid Key' },
});

import { expect, vi } from 'vitest';

import { createFakeCrud } from '../test-utils/fakeCrud.js';
import { describeCrudService } from '../test-utils/crudServiceSuite.js';

interface FakeCategory {
  id: string;
  key: string;
  labelFr: string;
  labelEn: string;
  labelRu: string;
  description?: string | null;
}

const categories = new Map<string, FakeCategory>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    category: createFakeCrud<FakeCategory>(categories, () => `category_${nextId++}`, 'key'),
  },
}));

const service = await import('./service.js');

function seedCategory(overrides: Partial<FakeCategory> = {}): FakeCategory {
  const category: FakeCategory = {
    id: `category_${nextId++}`,
    key: `key-${nextId}`,
    labelFr: 'Théologie',
    labelEn: 'Theology',
    labelRu: 'Богословие',
    ...overrides,
  };
  categories.set(category.id, category);
  return category;
}

describeCrudService<FakeCategory>({
  entityName: 'category',
  list: service.listCategories,
  create: (input) => service.createCategory(input as never),
  get: service.getCategory,
  update: (id, patch) => service.updateCategory(id, patch as never),
  remove: service.deleteCategory,
  ErrorClass: service.CategoryError,
  seed: seedCategory,
  resetStore: () => categories.clear(),
  validCreateInput: {
    key: 'theology',
    labelFr: 'Théologie',
    labelEn: 'Theology',
    labelRu: 'Богословие',
  },
  buildConflictingInput: (existing) => ({
    key: existing.key,
    labelFr: 'Duplicate',
    labelEn: 'Duplicate',
    labelRu: 'Дубликат',
  }),
  updatePatch: { labelFr: 'New label' },
  assertCreated: (created) => expect(created.key).toBe('theology'),
  assertUpdated: (updated) => expect(updated.labelFr).toBe('New label'),
});

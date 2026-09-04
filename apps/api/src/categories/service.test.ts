import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeCategory {
  id: string;
  key: string;
  labelFr: string;
  labelEn: string;
  labelRu: string;
  description?: string;
}

const categories = new Map<string, FakeCategory>();
let nextId = 1;

vi.mock('@orbis-fidei/database', () => ({
  prisma: {
    category: {
      findMany: vi.fn(async () => [...categories.values()]),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; key?: string } }) => {
        if (where.id) return categories.get(where.id) ?? null;
        if (where.key) return [...categories.values()].find((c) => c.key === where.key) ?? null;
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<FakeCategory, 'id'> }) => {
        const category: FakeCategory = { id: `category_${nextId++}`, ...data };
        categories.set(category.id, category);
        return category;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeCategory> }) => {
          const category = categories.get(where.id);
          if (!category) throw new Error('not found');
          Object.assign(category, data);
          return category;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        categories.delete(where.id);
      }),
    },
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

describe('categories service', () => {
  afterEach(() => categories.clear());

  it('liste les catégories existantes', async () => {
    seedCategory();
    await expect(service.listCategories()).resolves.toHaveLength(1);
  });

  it('crée une catégorie', async () => {
    const created = await service.createCategory({
      key: 'theology',
      labelFr: 'Théologie',
      labelEn: 'Theology',
      labelRu: 'Богословие',
    });
    expect(created.key).toBe('theology');
  });

  it('refuse de créer une catégorie avec une clé déjà utilisée', async () => {
    const existing = seedCategory();
    await expect(
      service.createCategory({
        key: existing.key,
        labelFr: 'Doublon',
        labelEn: 'Duplicate',
        labelRu: 'Дубликат',
      }),
    ).rejects.toThrow(service.CategoryError);
  });

  it('lève une erreur 404 pour une catégorie introuvable', async () => {
    await expect(service.getCategory('unknown')).rejects.toThrow(service.CategoryError);
  });

  it('met à jour une catégorie existante', async () => {
    const category = seedCategory();
    const updated = await service.updateCategory(category.id, { labelFr: 'Nouveau libellé' });
    expect(updated.labelFr).toBe('Nouveau libellé');
  });

  it('supprime une catégorie existante', async () => {
    const category = seedCategory();
    await service.deleteCategory(category.id);
    await expect(service.getCategory(category.id)).rejects.toThrow(service.CategoryError);
  });
});

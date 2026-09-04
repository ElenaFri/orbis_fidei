import { vi } from 'vitest';

/**
 * Builds a fake Prisma-model CRUD mock backed by an in-memory Map.
 *
 * Safe to call directly inside a `vi.mock()` factory: the factory only executes
 * lazily (when the mocked module is first imported), by which point the calling
 * file's own top-level `const store = new Map()` has already run. Do NOT wrap
 * this call in `vi.hoisted()` — that forces eager execution before imports are
 * linked and breaks (see /memories/repo/conventions.md).
 */
export function createFakeCrud<T extends { id: string }>(
  store: Map<string, T>,
  generateId: () => string,
  uniqueField?: keyof T,
) {
  return {
    findMany: vi.fn(async () => [...store.values()]),
    findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id) return store.get(where.id as string) ?? null;
      if (uniqueField) {
        const value = where[uniqueField as string];
        if (value !== undefined) {
          return [...store.values()].find((item) => item[uniqueField] === value) ?? null;
        }
      }
      return null;
    }),
    create: vi.fn(async ({ data }: { data: Omit<T, 'id'> }) => {
      const record = { id: generateId(), ...data } as T;
      store.set(record.id, record);
      return record;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<T> }) => {
      const record = store.get(where.id);
      if (!record) throw new Error('not found');
      Object.assign(record, data);
      return record;
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      store.delete(where.id);
    }),
  };
}

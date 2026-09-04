import { afterEach, describe, expect, it } from 'vitest';

export interface CrudServiceSuiteOptions<TEntity extends { id: string }> {
  /** Human-readable entity name, used in test descriptions (e.g. "source"). */
  entityName: string;
  list: () => Promise<TEntity[]>;
  create: (input: Record<string, unknown>) => Promise<TEntity>;
  get: (id: string) => Promise<TEntity>;
  update: (id: string, patch: Record<string, unknown>) => Promise<TEntity>;
  remove: (id: string) => Promise<void>;
  /** Error class thrown by the service on not-found/conflict. */
  ErrorClass: new (...args: never[]) => Error;
  /** Inserts a fake entity directly into the store, bypassing `create`. */
  seed: (overrides?: Partial<TEntity>) => TEntity;
  /** Clears the in-memory fake store between tests. */
  resetStore: () => void;
  validCreateInput: Record<string, unknown>;
  /** Builds a `create` input that conflicts with the given seeded entity (e.g. same URL/key). */
  buildConflictingInput: (existing: TEntity) => Record<string, unknown>;
  updatePatch: Record<string, unknown>;
  assertCreated: (created: TEntity) => void;
  assertUpdated: (updated: TEntity) => void;
}

/**
 * Shared CRUD service assertions reused across the flat admin domains
 * (sources, categories) which only differ by entity shape and service method names.
 */
export function describeCrudService<TEntity extends { id: string }>(
  options: CrudServiceSuiteOptions<TEntity>,
): void {
  const {
    entityName,
    list,
    create,
    get,
    update,
    remove,
    ErrorClass,
    seed,
    resetStore,
    validCreateInput,
    buildConflictingInput,
    updatePatch,
    assertCreated,
    assertUpdated,
  } = options;

  describe(`${entityName} service`, () => {
    afterEach(() => resetStore());

    it(`lists existing ${entityName}s`, async () => {
      seed();
      await expect(list()).resolves.toHaveLength(1);
    });

    it(`creates a ${entityName}`, async () => {
      const created = await create(validCreateInput);
      assertCreated(created);
    });

    it(`rejects creating a ${entityName} with a conflicting unique field`, async () => {
      const existing = seed();
      await expect(create(buildConflictingInput(existing))).rejects.toThrow(ErrorClass);
    });

    it(`throws a 404 error for an unknown ${entityName}`, async () => {
      await expect(get('unknown')).rejects.toThrow(ErrorClass);
    });

    it(`updates an existing ${entityName}`, async () => {
      const entity = seed();
      const updated = await update(entity.id, updatePatch);
      assertUpdated(updated);
    });

    it(`deletes an existing ${entityName}`, async () => {
      const entity = seed();
      await remove(entity.id);
      await expect(get(entity.id)).rejects.toThrow(ErrorClass);
    });
  });
}

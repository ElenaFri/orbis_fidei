import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { tokenWith } from './testApp.js';

export interface CrudRouteSuiteOptions {
  /** Human-readable entity name, used in test descriptions (e.g. "source"). */
  entityName: string;
  /** Base collection path (e.g. "/admin/sources"). */
  basePath: string;
  /** Permission key required to access the routes (e.g. "source.manage"). */
  permission: string;
  buildTestApp: () => Promise<FastifyInstance>;
  /** Clears the in-memory fake store between tests. */
  resetStore: () => void;
  /** Valid payload for creating an entity. */
  validPayload: Record<string, unknown>;
  /** Payload missing required fields, expected to fail validation. */
  invalidCreatePayload: Record<string, unknown>;
  /** Field name to update and assert on (e.g. "name" or "labelFr"). */
  updateField: string;
  updateValue: string;
  /** Payload that fails validation on PATCH (e.g. wrong enum value or format). */
  invalidPatchPayload: Record<string, unknown>;
}

/**
 * Shared permission-gating + CRUD assertions reused across the flat admin domains
 * (sources, categories) which only differ by payload shape and route names.
 */
export function describeCrudRoutes(options: CrudRouteSuiteOptions): void {
  const {
    entityName,
    basePath,
    permission,
    buildTestApp,
    resetStore,
    validPayload,
    invalidCreatePayload,
    updateField,
    updateValue,
    invalidPatchPayload,
  } = options;

  describe(`${entityName} routes`, () => {
    afterEach(() => resetStore());

    it('rejects with 401 when unauthenticated', async () => {
      const app = await buildTestApp();
      const response = await app.inject({ method: 'GET', url: basePath });
      expect(response.statusCode).toBe(401);
    });

    it(`rejects with 403 without the '${permission}' permission`, async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'GET',
        url: basePath,
        headers: { authorization: `Bearer ${await tokenWith([])}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('creates then lists an entity with the required permission', async () => {
      const app = await buildTestApp();
      const auth = { authorization: `Bearer ${await tokenWith([permission])}` };

      const created = await app.inject({
        method: 'POST',
        url: basePath,
        headers: auth,
        payload: validPayload,
      });
      expect(created.statusCode).toBe(201);

      const list = await app.inject({ method: 'GET', url: basePath, headers: auth });
      expect(list.json()).toHaveLength(1);
    });

    it('rejects creation with an invalid body', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: basePath,
        headers: { authorization: `Bearer ${await tokenWith([permission])}` },
        payload: invalidCreatePayload,
      });
      expect(response.statusCode).toBe(400);
    });

    it('updates then deletes an entity', async () => {
      const app = await buildTestApp();
      const auth = { authorization: `Bearer ${await tokenWith([permission])}` };

      const created = await app.inject({
        method: 'POST',
        url: basePath,
        headers: auth,
        payload: validPayload,
      });
      const { id } = created.json();

      const updated = await app.inject({
        method: 'PATCH',
        url: `${basePath}/${id}`,
        headers: auth,
        payload: { [updateField]: updateValue },
      });
      expect(updated.json()[updateField]).toBe(updateValue);

      const deleted = await app.inject({
        method: 'DELETE',
        url: `${basePath}/${id}`,
        headers: auth,
      });
      expect(deleted.statusCode).toBe(204);

      const getAfterDelete = await app.inject({
        method: 'GET',
        url: `${basePath}/${id}`,
        headers: auth,
      });
      expect(getAfterDelete.statusCode).toBe(404);
    });

    it('returns 404 for an unknown entity (get/patch/delete)', async () => {
      const app = await buildTestApp();
      const auth = { authorization: `Bearer ${await tokenWith([permission])}` };

      const get = await app.inject({ method: 'GET', url: `${basePath}/unknown`, headers: auth });
      expect(get.statusCode).toBe(404);

      const patch = await app.inject({
        method: 'PATCH',
        url: `${basePath}/unknown`,
        headers: auth,
        payload: { [updateField]: updateValue },
      });
      expect(patch.statusCode).toBe(404);

      const del = await app.inject({ method: 'DELETE', url: `${basePath}/unknown`, headers: auth });
      expect(del.statusCode).toBe(404);
    });

    it('rejects an update with an invalid body', async () => {
      const app = await buildTestApp();
      const auth = { authorization: `Bearer ${await tokenWith([permission])}` };

      const created = await app.inject({
        method: 'POST',
        url: basePath,
        headers: auth,
        payload: validPayload,
      });
      const { id } = created.json();

      const response = await app.inject({
        method: 'PATCH',
        url: `${basePath}/${id}`,
        headers: auth,
        payload: invalidPatchPayload,
      });
      expect(response.statusCode).toBe(400);
    });
  });
}

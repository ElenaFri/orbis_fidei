import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { adminGuard } from './guards.js';

function fakeRoute(requiresPermission?: string): RouteLocationNormalized {
  return { meta: { requiresPermission } } as unknown as RouteLocationNormalized;
}

describe('adminGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('laisse passer les routes sans permission requise', () => {
    expect(adminGuard(fakeRoute())).toBe(true);
  });

  it('redirige vers /login si non authentifié', () => {
    const result = adminGuard(fakeRoute('source.manage'));
    expect(result).toEqual({ name: 'login' });
  });

  it("redirige vers l'accueil si authentifié sans la permission requise", () => {
    const auth = useAuthStore();
    auth.$patch({
      user: { id: '1', email: 'a@b.com', displayName: 'A', preferredLang: 'FR', permissions: [] },
    });

    const result = adminGuard(fakeRoute('source.manage'));
    expect(result).toEqual({ name: 'home' });
  });

  it('laisse passer si authentifié avec la permission requise', () => {
    const auth = useAuthStore();
    auth.$patch({
      user: {
        id: '1',
        email: 'a@b.com',
        displayName: 'A',
        preferredLang: 'FR',
        permissions: ['source.manage'],
      },
    });

    expect(adminGuard(fakeRoute('source.manage'))).toBe(true);
  });
});

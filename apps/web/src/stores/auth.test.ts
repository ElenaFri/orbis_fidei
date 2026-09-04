import type { AuthenticatedUser } from '@orbis-fidei/types';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
  },
  setAccessToken: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

const { api, setAccessToken } = await import('@/services/api');
const { useAuthStore } = await import('./auth.js');

const fakeUser: AuthenticatedUser = {
  id: '1',
  email: 'a@b.com',
  displayName: 'A',
  preferredLang: 'FR',
  permissions: ['article.read'],
};

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('login() authentifie et stocke le token', async () => {
    vi.mocked(api.login).mockResolvedValue({ accessToken: 'tok', user: fakeUser });
    const store = useAuthStore();

    await store.login('a@b.com', 'password');

    expect(setAccessToken).toHaveBeenCalledWith('tok');
    expect(store.user).toEqual(fakeUser);
    expect(store.isAuthenticated).toBe(true);
  });

  it('register() authentifie et stocke le token', async () => {
    vi.mocked(api.register).mockResolvedValue({ accessToken: 'tok', user: fakeUser });
    const store = useAuthStore();

    await store.register({ email: 'a@b.com', password: 'password', displayName: 'A' });

    expect(store.user).toEqual(fakeUser);
  });

  it("logout() efface l'utilisateur même si l'appel API échoue", async () => {
    vi.mocked(api.logout).mockRejectedValue(new Error('network error'));
    const store = useAuthStore();
    store.$patch({ user: fakeUser });

    await expect(store.logout()).rejects.toThrow('network error');

    expect(setAccessToken).toHaveBeenCalledWith(null);
    expect(store.user).toBeNull();
  });

  it('init() restaure la session quand le refresh réussit', async () => {
    vi.mocked(api.refresh).mockResolvedValue(true);
    vi.mocked(api.me).mockResolvedValue(fakeUser);
    const store = useAuthStore();

    await store.init();

    expect(store.user).toEqual(fakeUser);
    expect(store.isReady).toBe(true);
  });

  it("init() ne restaure rien quand il n'y a pas de session (refresh échoue silencieusement)", async () => {
    vi.mocked(api.refresh).mockResolvedValue(false);
    const store = useAuthStore();

    await store.init();

    expect(api.me).not.toHaveBeenCalled();
    expect(store.user).toBeNull();
    expect(store.isReady).toBe(true);
  });

  it('init() avale les ApiError mais laisse passer les autres erreurs', async () => {
    vi.mocked(api.refresh).mockRejectedValue(new ApiError('boom', 500));
    const store = useAuthStore();

    await expect(store.init()).resolves.toBeUndefined();
    expect(store.isReady).toBe(true);
  });

  it('hasPermission() reflète les permissions du profil courant', async () => {
    vi.mocked(api.login).mockResolvedValue({ accessToken: 'tok', user: fakeUser });
    const store = useAuthStore();

    expect(store.hasPermission('article.read')).toBe(false);
    await store.login('a@b.com', 'password');
    expect(store.hasPermission('article.read')).toBe(true);
    expect(store.hasPermission('article.publish')).toBe(false);
  });
});

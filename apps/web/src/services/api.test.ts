import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError, setAccessToken } from './api.js';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('api client', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it('envoie les identifiants au bon endpoint et stocke le nouvel access token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ accessToken: 'abc', user: { id: '1' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.login('a@b.com', 'password');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(result.accessToken).toBe('abc');
  });

  it('lève une ApiError avec le message renvoyé par le serveur sur une réponse en échec', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: 'Identifiants invalides.' }, { status: 401 })),
    );

    await expect(api.login('a@b.com', 'wrong')).rejects.toMatchObject({
      message: 'Identifiants invalides.',
      statusCode: 401,
    });
  });

  it('rafraîchit silencieusement puis rejoue la requête après un 401', async () => {
    const fetchMock = vi
      .fn()
      // 1) requête initiale -> 401
      .mockResolvedValueOnce(jsonResponse({ error: 'Expiré.' }, { status: 401 }))
      // 2) /auth/refresh -> succès
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-token', user: { id: '1' } }))
      // 3) requête rejouée -> succès
      .mockResolvedValueOnce(jsonResponse({ id: '1', email: 'a@b.com' }));
    vi.stubGlobal('fetch', fetchMock);

    const me = await api.me();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/auth/refresh'),
      expect.anything(),
    );
    expect(me).toMatchObject({ id: '1' });
  });

  it('propage une ApiError si le refresh échoue aussi', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'Expiré.' }, { status: 401 }))
        .mockResolvedValueOnce(jsonResponse({ error: 'Refresh invalide.' }, { status: 401 })),
    );

    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  });

  it('retourne undefined pour une réponse 204 (logout)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(api.logout()).resolves.toBeUndefined();
  });

  it("envoie l'inscription au bon endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ accessToken: 'abc', user: { id: '1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await api.register({ email: 'a@b.com', password: 'password', displayName: 'A' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('refresh() renvoie false sans lever si le réseau échoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(api.refresh()).resolves.toBe(false);
  });
});

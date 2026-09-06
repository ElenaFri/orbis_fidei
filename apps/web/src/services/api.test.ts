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
      // 1) initial request -> 401
      .mockResolvedValueOnce(jsonResponse({ error: 'Expiré.' }, { status: 401 }))
      // 2) /auth/refresh -> success
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-token', user: { id: '1' } }))
      // 3) replayed request -> success
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

  it('sources.list() interroge le bon endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 's1' }]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.sources.list();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/sources'),
      expect.anything(),
    );
    expect(result).toEqual([{ id: 's1' }]);
  });

  it('sources.create() envoie un POST avec le corps attendu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 's1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.sources.create({
      name: 'KTO',
      url: 'https://kto.com/rss',
      language: 'FR',
      type: 'RSS',
      fetchIntervalMin: 60,
      status: 'ACTIVE',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/sources'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sources.remove() envoie un DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.sources.remove('s1');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/sources/s1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('sources.update() envoie un PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 's1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.sources.update('s1', { name: 'Nouveau nom' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/sources/s1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('categories.create() envoie un POST avec le corps attendu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'c1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.categories.create({
      key: 'theology',
      labelFr: 'Théologie',
      labelEn: 'Theology',
      labelRu: 'Богословие',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/categories'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('categories.update() envoie un PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'c1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.categories.update('c1', { labelFr: 'Nouveau libellé' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/categories/c1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('categories.remove() envoie un DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.categories.remove('c1');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/categories/c1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('articles.create() envoie un POST avec le corps attendu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'a1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.articles.create({
      slug: 'mon-article',
      originalLang: 'FR',
      categoryIds: [],
      translations: [
        {
          language: 'FR',
          title: 'Titre suffisant',
          summary: 'Résumé suffisant.',
          analysis: 'Analyse suffisante.',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/articles'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('articles.get() interroge le bon endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'a1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.articles.get('a1');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/articles/a1'),
      expect.anything(),
    );
  });

  it('articles.update() envoie un PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'a1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.articles.update('a1', { categoryIds: ['cat_1'] });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/articles/a1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('proposals.list() interroge la file de modération', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    await api.proposals.list();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/suggestions'),
      expect.anything(),
    );
  });

  it('proposals.accept() envoie la décision au backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'article_1' }));
    vi.stubGlobal('fetch', fetchMock);
    await api.proposals.accept('proposal_1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/suggestions/proposal_1/accept'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('proposals.reject() envoie le rejet au backend', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 'proposal_1', status: 'REJECTED' }));
    vi.stubGlobal('fetch', fetchMock);
    await api.proposals.reject('proposal_1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/suggestions/proposal_1/reject'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('publicArticles.list() construit la requête paginée', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], total: 0, page: 2, pageSize: 20 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.publicArticles.list('EN', 2);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/articles?lang=EN&page=2'),
      expect.anything(),
    );
  });

  it('publicArticles.get() encode le slug', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'a1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.publicArticles.get('un slug');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/articles/un%20slug?lang=FR'),
      expect.anything(),
    );
  });

  it('comments.list() appelle le endpoint public des commentaires', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await api.comments.list('a1');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/articles/a1/comments'),
      expect.anything(),
    );
  });

  it('comments.create() poste le contenu et la réponse éventuelle', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'comment_1' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.comments.create('a1', 'Un commentaire.', 'comment_0');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/articles/a1/comments'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'Un commentaire.', parentId: 'comment_0' }),
      }),
    );
  });
});

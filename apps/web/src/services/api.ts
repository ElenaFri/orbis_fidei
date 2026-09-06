import type {
  AdminArticle,
  AdminCategory,
  AdminSource,
  AuthenticatedUser,
  PublicArticle,
  PublicArticleListItem,
  PublicComment,
  AdminProposal,
} from '@orbis-fidei/types';
import type {
  ArticleCreateInput,
  ArticleUpdateInput,
  CategoryInput,
  SourceInput,
} from '@orbis-fidei/validation';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface AuthResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
/** Prevents concurrent refreshes (several requests failing with 401 at the same time). */
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include', // send the httpOnly refresh token cookie
  });
}

async function tryRefresh(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const response = await rawRequest('/auth/refresh', { method: 'POST' });
      if (!response.ok) return false;
      const body = (await response.json()) as AuthResponse;
      setAccessToken(body.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/** Authenticated request with a silent refresh attempt on 401. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await rawRequest(path, init);

  if (response.status === 401 && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await rawRequest(path, init);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(body.error ?? 'Erreur inconnue.', response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (input: { email: string; password: string; displayName: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  refresh: () => tryRefresh(),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  me: () => request<AuthenticatedUser>('/me'),

  sources: {
    list: () => request<AdminSource[]>('/admin/sources'),
    create: (input: SourceInput) =>
      request<AdminSource>('/admin/sources', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: Partial<SourceInput>) =>
      request<AdminSource>(`/admin/sources/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<void>(`/admin/sources/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request<AdminCategory[]>('/admin/categories'),
    create: (input: CategoryInput) =>
      request<AdminCategory>('/admin/categories', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: Partial<CategoryInput>) =>
      request<AdminCategory>(`/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<void>(`/admin/categories/${id}`, { method: 'DELETE' }),
  },

  articles: {
    list: () => request<AdminArticle[]>('/admin/articles'),
    get: (id: string) => request<AdminArticle>(`/admin/articles/${id}`),
    create: (input: ArticleCreateInput) =>
      request<AdminArticle>('/admin/articles', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: ArticleUpdateInput) =>
      request<AdminArticle>(`/admin/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  },

  publicArticles: {
    list: (lang = 'FR', page = 1) =>
      request<{ items: PublicArticleListItem[]; total: number; page: number; pageSize: number }>(
        `/articles?lang=${lang}&page=${page}`,
      ),
    get: (slug: string, lang = 'FR') =>
      request<PublicArticle>(`/articles/${encodeURIComponent(slug)}?lang=${lang}`),
  },

  comments: {
    list: (articleId: string) => request<PublicComment[]>(`/articles/${articleId}/comments`),
    create: (articleId: string, content: string, parentId?: string) =>
      request<PublicComment>(`/articles/${articleId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      }),
  },

  proposals: {
    list: () => request<AdminProposal[]>('/admin/suggestions'),
    accept: (id: string) =>
      request<AdminArticle>(`/admin/suggestions/${id}/accept`, { method: 'POST' }),
    reject: (id: string) =>
      request<AdminProposal>(`/admin/suggestions/${id}/reject`, { method: 'POST' }),
  },
};

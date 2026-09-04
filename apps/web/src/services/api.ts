import type { AuthenticatedUser } from '@orbis-fidei/types';

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
/** Évite les rafraîchissements concurrents (plusieurs requêtes en échec 401 en même temps). */
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
    credentials: 'include', // envoie le cookie httpOnly de refresh token
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

/** Requête authentifiée avec tentative silencieuse de refresh en cas de 401. */
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
};

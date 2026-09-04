import type { AuthenticatedUser } from '@orbis-fidei/types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { api, setAccessToken, ApiError } from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null);
  const isReady = ref(false);

  const isAuthenticated = computed(() => user.value !== null);

  async function login(email: string, password: string): Promise<void> {
    const result = await api.login(email, password);
    setAccessToken(result.accessToken);
    user.value = result.user;
  }

  async function register(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<void> {
    const result = await api.register(input);
    setAccessToken(result.accessToken);
    user.value = result.user;
  }

  async function logout(): Promise<void> {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      user.value = null;
    }
  }

  /** Attempts to restore the session via the refresh cookie (called on app startup). */
  async function init(): Promise<void> {
    try {
      const refreshed = await api.refresh();
      if (refreshed) {
        user.value = await api.me();
      }
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      isReady.value = true;
    }
  }

  function hasPermission(key: string): boolean {
    return user.value?.permissions.includes(key) ?? false;
  }

  return { user, isReady, isAuthenticated, login, register, logout, init, hasPermission };
});

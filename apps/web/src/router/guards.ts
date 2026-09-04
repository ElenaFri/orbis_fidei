import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

/** Redirects to /login (not authenticated) or / (missing permission) based on `meta.requiresPermission`. */
export function adminGuard(to: RouteLocationNormalized): true | RouteLocationRaw {
  const requiredPermission = to.meta.requiresPermission;
  if (!requiredPermission) return true;

  const auth = useAuthStore();
  if (!auth.isAuthenticated) return { name: 'login' };
  if (!auth.hasPermission(requiredPermission)) return { name: 'home' };
  return true;
}

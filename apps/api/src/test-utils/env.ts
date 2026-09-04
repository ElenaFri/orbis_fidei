/**
 * Sets the minimal environment variables required to load `config.ts` in tests
 * (fail-fast otherwise). Idempotent: safe to call multiple times without side effects.
 */
export function setTestEnv(): void {
  process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL ??= 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789';
  process.env.NODE_ENV = 'test';
}

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView } from 'vue-router';

import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import UserMenu from '@/components/UserMenu.vue';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();

const canAccessAdmin = computed(
  () =>
    auth.hasPermission('source.manage') ||
    auth.hasPermission('category.manage') ||
    auth.hasPermission('article.create'),
);
</script>

<template>
  <div class="app">
    <header class="app-header">
      <RouterLink to="/" class="app-title"> Orbis Fidei </RouterLink>
      <nav>
        <RouterLink to="/">
          {{ t('nav.home') }}
        </RouterLink>
        <RouterLink to="/search">
          {{ t('nav.search') }}
        </RouterLink>
        <RouterLink v-if="canAccessAdmin" to="/admin">
          {{ t('nav.admin') }}
        </RouterLink>
        <RouterLink v-if="!auth.isAuthenticated" to="/login">
          {{ t('nav.login') }}
        </RouterLink>
      </nav>
      <UserMenu v-if="auth.isAuthenticated" />
      <LanguageSwitcher />
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <p>© {{ new Date().getFullYear() }} Orbis Fidei</p>
    </footer>
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.app-title {
  font-weight: 700;
  font-size: 1.25rem;
  text-decoration: none;
  color: inherit;
}

.app-header nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-right: auto;
}

.app-header nav a {
  color: var(--color-muted, #6b7280);
  text-decoration: none;
  padding-bottom: 2px;
}

.app-header nav a:hover {
  color: var(--color-text, #111827);
}

/* Active tab highlighted — will be revisited with the final visual design. */
.app-header nav a.router-link-exact-active {
  color: var(--color-accent, #1e40af);
  font-weight: 700;
  border-bottom: 2px solid var(--color-accent, #1e40af);
}

.app-main {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  padding: 1rem 2rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
}
</style>

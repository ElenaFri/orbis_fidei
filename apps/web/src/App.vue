<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView } from 'vue-router';

import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

const { t } = useI18n();
</script>

<template>
  <div class="app">
    <header class="app-header">
      <RouterLink to="/" class="app-title">Orbis Fidei</RouterLink>
      <nav>
        <RouterLink to="/">{{ t('nav.home') }}</RouterLink>
        <RouterLink to="/search">{{ t('nav.search') }}</RouterLink>
      </nav>
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
  gap: 1rem;
  margin-right: auto;
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

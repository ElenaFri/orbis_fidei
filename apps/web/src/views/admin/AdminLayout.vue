<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <RouterLink v-if="auth.hasPermission('proposal.review')" :to="{ name: 'admin-suggestions' }">
        {{ t('admin.suggestions') }}
      </RouterLink>
      <RouterLink v-if="auth.hasPermission('source.manage')" :to="{ name: 'admin-sources' }">
        {{ t('admin.sources') }}
      </RouterLink>
      <RouterLink v-if="auth.hasPermission('category.manage')" :to="{ name: 'admin-categories' }">
        {{ t('admin.categories') }}
      </RouterLink>
      <RouterLink v-if="auth.hasPermission('article.create')" :to="{ name: 'admin-articles' }">
        {{ t('admin.articles') }}
      </RouterLink>
      <RouterLink v-if="auth.hasPermission('user.manage')" :to="{ name: 'admin-users' }">
        {{ t('admin.users') }}
      </RouterLink>
    </aside>

    <section class="admin-content">
      <RouterView />
    </section>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.admin-sidebar {
  padding: 1rem;
  background: var(--color-surface, #fffdf8);
  border: 1px solid var(--color-border, #dcd4c8);
  border-top: 3px solid var(--color-copper, #a87332);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 190px;
}

.admin-sidebar a.router-link-active {
  font-weight: 700;
  color: var(--color-accent, #762f35);
  border-left: 2px solid var(--color-copper, #a87332);
  padding-left: 0.55rem;
}

.admin-content {
  flex: 1;
  min-width: 0;
}
</style>

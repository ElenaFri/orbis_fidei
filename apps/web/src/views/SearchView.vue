<script setup lang="ts">
import type { AdminCategory, AdminSource, PublicArticleListItem } from '@orbis-fidei/types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ArticleCard from '@/components/ArticleCard.vue';
import { ApiError, api } from '@/services/api';
import { formatCategoryLabel } from '@/utils/category';

const { t, locale } = useI18n();
const query = ref('');
const category = ref('');
const sourceId = ref('');
const results = ref<PublicArticleListItem[]>([]);
const categories = ref<AdminCategory[]>([]);
const sources = ref<AdminSource[]>([]);
const error = ref<string | null>(null);
const isLoading = ref(false);
const expandedId = ref<string | null>(null);

async function loadFilters() {
  try {
    [categories.value, sources.value] = await Promise.all([
      api.categories.list(),
      api.sources.list(),
    ]);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('articles.loadError');
  }
}

async function search() {
  isLoading.value = true;
  error.value = null;
  try {
    const result = await api.publicArticles.list(
      locale.value.toUpperCase() as 'FR' | 'EN' | 'RU',
      1,
      {
        query: query.value.trim() || undefined,
        category: category.value || undefined,
        sourceId: sourceId.value || undefined,
      },
    );
    results.value = result.items;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('articles.loadError');
  } finally {
    isLoading.value = false;
  }
}

void loadFilters();
</script>

<template>
  <section>
    <h1>{{ t('search.title') }}</h1>
    <form class="search-form" @submit.prevent="search">
      <label for="search-input">{{ t('search.placeholder') }}</label>
      <input
        id="search-input"
        v-model="query"
        type="search"
        :placeholder="t('search.placeholder')"
      />
      <label for="search-category">{{ t('admin.categories') }}</label>
      <select id="search-category" v-model="category">
        <option value="">{{ t('search.allCategories') }}</option>
        <option v-for="item in categories" :key="item.id" :value="item.key">
          {{ formatCategoryLabel(item, locale) }}
        </option>
      </select>
      <label for="search-source">{{ t('admin.source') }}</label>
      <select id="search-source" v-model="sourceId">
        <option value="">{{ t('search.allSources') }}</option>
        <option v-for="source in sources" :key="source.id" :value="source.id">
          {{ source.name }}
        </option>
      </select>
      <button type="submit" :disabled="isLoading">{{ t('search.submit') }}</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="results.length === 0 && !isLoading" class="muted">{{ t('search.empty') }}</p>
    <div v-else class="article-list">
      <ArticleCard
        v-for="article in results"
        :key="article.id"
        :article="article"
        :expanded="expandedId === article.id"
        @toggle="expandedId = expandedId === article.id ? null : article.id"
      />
    </div>
  </section>
</template>

<style scoped>
.search-form {
  display: grid;
  gap: 0.6rem;
  max-width: 560px;
}
.search-form input,
.search-form select {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-border, #dcd4c8);
  border-radius: 3px;
  background: var(--color-surface, #fffdf8);
}
.search-form button {
  justify-self: start;
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 3px;
  background: var(--color-accent, #762f35);
  color: white;
  cursor: pointer;
}
.error {
  color: var(--color-danger, #963b36);
}
.muted {
  color: var(--color-muted, #756d64);
}
</style>

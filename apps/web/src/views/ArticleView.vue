<script setup lang="ts">
import type { PublicArticle } from '@orbis-fidei/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import CommentThread from '@/components/CommentThread.vue';
import { ApiError, api } from '@/services/api';
import { formatCategoryLabel } from '@/utils/category';

const { t, locale } = useI18n();
const route = useRoute();
const article = ref<PublicArticle | null>(null);
const error = ref<string | null>(null);

const categoriesList = computed(() => {
  if (!article.value) return [];
  if (article.value.categories && article.value.categories.length > 0) {
    return article.value.categories.map((cat) => formatCategoryLabel(cat, locale.value));
  }
  return article.value.categoryKeys || [];
});

async function loadArticle() {
  try {
    article.value = await api.publicArticles.get(String(route.params.slug));
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('articles.loadError');
  }
}

onMounted(loadArticle);
</script>

<template>
  <article v-if="article" class="article-view">
    <p class="article-meta">{{ article.sourceName }} · {{ article.language }}</p>
    <div v-if="categoriesList.length > 0" class="category-badges">
      <span v-for="catLabel in categoriesList" :key="catLabel" class="category-badge">
        {{ catLabel }}
      </span>
    </div>
    <h1>{{ article.title }}</h1>
    <p class="summary">{{ article.summary }}</p>

    <section class="analysis">
      <h2>{{ t('articles.analysis') }}</h2>
      <p>{{ article.analysis }}</p>
    </section>

    <p v-if="article.sourceUrl" class="source">
      {{ t('articles.source') }}
      <a :href="article.sourceUrl" target="_blank" rel="noopener noreferrer">{{
        article.sourceName
      }}</a>
    </p>

    <CommentThread :article-id="article.id" />
  </article>
  <p v-else-if="error" class="error">{{ error }}</p>
  <p v-else class="muted">{{ t('articles.loading') }}</p>
</template>

<style scoped>
.article-view {
  max-width: 760px;
  margin: 0 auto;
}

.article-meta,
.source,
.muted {
  color: var(--color-muted, #6b7280);
  font-size: 0.875rem;
}

.category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.category-badge {
  background: var(--color-bg-muted, #f3f4f6);
  color: var(--color-accent, #1e40af);
  border: 1px solid var(--color-border, #e5e7eb);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.summary {
  font-size: 1.15rem;
  line-height: 1.6;
}

.analysis {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.error {
  color: #b91c1c;
}
</style>

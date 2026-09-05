<script setup lang="ts">
import type { PublicArticleListItem } from '@orbis-fidei/types';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ArticleCard from '@/components/ArticleCard.vue';
import { ApiError, api } from '@/services/api';

const { t } = useI18n();
const articles = ref<PublicArticleListItem[]>([]);
const expandedId = ref<string | null>(null);
const error = ref<string | null>(null);
const isLoading = ref(true);

async function loadArticles() {
  try {
    const result = await api.publicArticles.list();
    articles.value = result.items;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('articles.loadError');
  } finally {
    isLoading.value = false;
  }
}

function toggleArticle(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

onMounted(loadArticles);
</script>

<template>
  <section>
    <h1>{{ t('home.title') }}</h1>
    <p class="tagline">{{ t('home.tagline') }}</p>
    <p v-if="isLoading" class="empty">{{ t('articles.loading') }}</p>
    <p v-else-if="error" class="empty error">{{ error }}</p>
    <p v-else-if="articles.length === 0" class="empty">{{ t('home.empty') }}</p>
    <div v-else class="article-list">
      <ArticleCard
        v-for="article in articles"
        :key="article.id"
        :article="article"
        :expanded="expandedId === article.id"
        @toggle="toggleArticle(article.id)"
      />
    </div>
  </section>
</template>

<style scoped>
.tagline {
  color: var(--color-muted, #6b7280);
  font-style: italic;
}

.empty {
  margin-top: 2rem;
  padding: 2rem;
  border: 1px dashed var(--color-border, #e5e7eb);
  border-radius: 8px;
  text-align: center;
  color: var(--color-muted, #6b7280);
}

.error {
  color: #b91c1c;
}
</style>

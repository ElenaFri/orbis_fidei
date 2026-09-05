<script setup lang="ts">
import type { PublicArticle } from '@orbis-fidei/types';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import CommentThread from '@/components/CommentThread.vue';
import { ApiError, api } from '@/services/api';

const { t } = useI18n();
const route = useRoute();
const article = ref<PublicArticle | null>(null);
const error = ref<string | null>(null);

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

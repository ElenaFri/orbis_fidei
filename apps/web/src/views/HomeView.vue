<script setup lang="ts">
import type { PublicArticleListItem } from '@orbis-fidei/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ArticleCard from '@/components/ArticleCard.vue';
import { ApiError, api } from '@/services/api';
import { formatCategoryLabel } from '@/utils/category';

const { t, locale } = useI18n();
const articles = ref<PublicArticleListItem[]>([]);
const expandedId = ref<string | null>(null);
const selectedCategory = ref<string | null>(null);
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

const visibleArticles = computed(() => {
  if (!selectedCategory.value) return articles.value;
  return articles.value.filter((article) => {
    const keys = article.categories?.map((category) => category.key) ?? article.categoryKeys;
    return keys.includes(selectedCategory.value!);
  });
});

const selectedCategoryLabel = computed(() => {
  if (!selectedCategory.value) return '';
  const article = articles.value.find((item) =>
    (item.categories?.map((category) => category.key) ?? item.categoryKeys).includes(
      selectedCategory.value!,
    ),
  );
  const category = article?.categories?.find((item) => item.key === selectedCategory.value);
  return category ? formatCategoryLabel(category, locale.value) : selectedCategory.value;
});

function selectCategory(category: string) {
  selectedCategory.value = selectedCategory.value === category ? null : category;
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
      <div v-if="selectedCategory" class="active-filter">
        <span>{{ t('home.categoryFilter', { category: selectedCategoryLabel }) }}</span>
        <button type="button" @click="selectedCategory = null">{{ t('home.clearFilter') }}</button>
      </div>
      <p v-if="visibleArticles.length === 0" class="empty">{{ t('home.noCategoryArticles') }}</p>
      <ArticleCard
        v-for="article in visibleArticles"
        :key="article.id"
        :article="article"
        :expanded="expandedId === article.id"
        @toggle="toggleArticle(article.id)"
        @category="selectCategory"
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

.active-filter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.active-filter button {
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--color-border, #dcd4c8);
  border-radius: 3px;
  background: var(--color-surface, #fffdf8);
  color: var(--color-accent, #762f35);
  cursor: pointer;
}
</style>

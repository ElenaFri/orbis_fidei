<script setup lang="ts">
import type { PublicArticleListItem } from '@orbis-fidei/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatCategoryLabel } from '@/utils/category';

const props = defineProps<{
  article: PublicArticleListItem;
  expanded?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  category: [key: string];
}>();
const { t, locale } = useI18n();

const categoryItems = computed(() => {
  if (props.article.categories && props.article.categories.length > 0) {
    return props.article.categories.map((cat) => ({
      key: cat.key,
      label: formatCategoryLabel(cat, locale.value),
    }));
  }
  return (props.article.categoryKeys || []).map((key) => ({ key, label: key }));
});
</script>

<template>
  <article class="article-card" :class="{ expanded: props.expanded }">
    <button
      class="article-summary"
      type="button"
      :aria-expanded="props.expanded"
      @click="emit('toggle')"
    >
      <span class="article-meta">
        {{ props.article.sourceName ?? t('articles.unknownSource') }}
        · {{ new Date(props.article.publishedAt ?? Date.now()).toLocaleDateString() }}
      </span>
      <span class="article-title">{{ props.article.title }}</span>
      <span class="article-toggle" aria-hidden="true">{{ props.expanded ? '−' : '+' }}</span>
    </button>

    <div v-if="props.expanded" class="article-expanded">
      <div v-if="categoryItems.length > 0" class="category-badges">
        <button
          v-for="category in categoryItems"
          :key="category.key"
          type="button"
          class="category-badge"
          @click.stop="emit('category', category.key)"
        >
          {{ category.label }}
        </button>
      </div>
      <p class="article-summary-text">{{ props.article.summary }}</p>
      <RouterLink class="article-link" :to="`/a/${props.article.slug}`">
        {{ t('articles.readMore') }}
      </RouterLink>
      <span class="comment-count">
        {{ t('articles.comments', { count: props.article.commentCount }) }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.article-card {
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.article-summary {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  width: 100%;
  padding: 1rem 2.25rem 1rem 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.article-meta {
  color: var(--color-muted, #6b7280);
  font-size: 0.8rem;
}

.article-title {
  font-weight: 650;
  line-height: 1.3;
}

.article-toggle {
  position: absolute;
  top: 1rem;
  right: 0.25rem;
  color: var(--color-accent, #1e40af);
  font-size: 1.25rem;
  font-weight: 700;
}

.article-expanded {
  padding: 0 0 1rem;
}

.category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}

.category-badge {
  background: var(--color-bg-muted, #f3f4f6);
  color: var(--color-accent, #1e40af);
  border: 1px solid var(--color-border, #e5e7eb);
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.category-badge:hover {
  background: var(--color-border, #e5e7eb);
}

.article-summary-text {
  margin: 0 0 0.75rem;
  color: var(--color-muted, #4b5563);
}

.article-link {
  margin-right: 1rem;
  font-weight: 650;
}

.comment-count {
  color: var(--color-muted, #6b7280);
  font-size: 0.875rem;
}
</style>

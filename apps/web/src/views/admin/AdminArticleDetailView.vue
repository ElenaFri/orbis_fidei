<script setup lang="ts">
import type { AdminArticle, AdminCategory } from '@orbis-fidei/types';
import { slugify } from '@orbis-fidei/validation';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';

import { ApiError, api } from '@/services/api';

const { t, locale } = useI18n();
const route = useRoute();
const article = ref<AdminArticle | null>(null);
const categories = ref<AdminCategory[]>([]);
const error = ref<string | null>(null);
const editingField = ref<'slug' | 'title' | 'summary' | 'analysis' | 'categories' | null>(null);
const isSaving = ref(false);
const isAddingCategory = ref(false);
const isCategorySubmitting = ref(false);

const form = reactive({
  slug: '',
  title: '',
  summary: '',
  analysis: '',
  categoryIds: [] as string[],
});

const categoryForm = reactive({
  key: '',
  labelFr: '',
  labelEn: '',
  labelRu: '',
});

function onCategoryLabelFrInput() {
  if (categoryForm.labelFr) {
    categoryForm.key = slugify(categoryForm.labelFr);
  }
}

const originalTranslation = computed(() => {
  if (!article.value) return undefined;
  return (
    article.value.translations.find((item) => item.language === article.value?.originalLang) ??
    article.value.translations[0]
  );
});

const sourceUrl = computed(() => {
  return article.value?.proposal?.sourceItem?.originalUrl ?? article.value?.source?.url;
});

function getCategoryLabel(cat: AdminCategory): string {
  if (locale.value === 'ru') return cat.labelRu || cat.labelFr || cat.key;
  if (locale.value === 'en') return cat.labelEn || cat.labelFr || cat.key;
  return cat.labelFr || cat.key;
}

const articleCategories = computed(() => {
  if (!article.value) return [];
  const assignedIds = new Set(article.value.categories.map((c) => c.categoryId));
  return categories.value.filter((cat) => assignedIds.has(cat.id));
});

function statusLabel(status: string): string {
  const key = `articleStatuses.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

async function loadArticle() {
  try {
    const [fetchedArticle, fetchedCategories] = await Promise.all([
      api.articles.get(String(route.params.id)),
      api.categories.list(),
    ]);
    article.value = fetchedArticle;
    categories.value = fetchedCategories;

    if (article.value) {
      form.slug = article.value.slug;
      form.categoryIds = article.value.categories.map((c) => c.categoryId);
    }
    const translation = originalTranslation.value;
    if (translation) {
      form.title = translation.title;
      form.summary = translation.summary;
      form.analysis = translation.analysis;
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

function startEdit(field: 'slug' | 'title' | 'summary' | 'analysis' | 'categories') {
  editingField.value = field;
  if (field === 'categories' && article.value) {
    form.categoryIds = article.value.categories.map((c) => c.categoryId);
  }
}

function cancelEdit() {
  editingField.value = null;
  isAddingCategory.value = false;
  if (article.value) {
    form.slug = article.value.slug;
    form.categoryIds = article.value.categories.map((c) => c.categoryId);
  }
  const translation = originalTranslation.value;
  if (translation) {
    form.title = translation.title;
    form.summary = translation.summary;
    form.analysis = translation.analysis;
  }
}

async function onCreateCategory() {
  error.value = null;
  isCategorySubmitting.value = true;
  try {
    const newCat = await api.categories.create({
      ...categoryForm,
    });
    categories.value.push(newCat);
    if (!form.categoryIds.includes(newCat.id)) {
      form.categoryIds.push(newCat.id);
    }
    categoryForm.key = '';
    categoryForm.labelFr = '';
    categoryForm.labelEn = '';
    categoryForm.labelRu = '';
    isAddingCategory.value = false;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    isCategorySubmitting.value = false;
  }
}

async function saveField() {
  if (!article.value || !editingField.value) return;
  isSaving.value = true;
  error.value = null;
  try {
    if (editingField.value === 'slug') {
      await api.articles.update(article.value.id, {
        slug: form.slug,
      });
    } else if (editingField.value === 'categories') {
      await api.articles.update(article.value.id, {
        categoryIds: form.categoryIds,
      });
    } else if (originalTranslation.value) {
      await api.articles.update(article.value.id, {
        translations: [
          {
            language: originalTranslation.value.language,
            title: form.title,
            summary: form.summary,
            analysis: form.analysis,
          },
        ],
      });
    }
    await loadArticle();
    editingField.value = null;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    isSaving.value = false;
  }
}

async function publishArticle() {
  if (!article.value || !window.confirm(t('admin.confirmPublishArticle'))) return;
  try {
    const current = await api.articles.get(article.value.id);
    if (current.status !== 'DRAFT') {
      article.value = current;
      return;
    }
    article.value = await api.articles.publish(current.id);
  } catch (err) {
    error.value = err instanceof ApiError ? `${err.message} (${err.statusCode})` : t('admin.error');
  }
}

async function archiveArticle() {
  if (!article.value || !window.confirm(t('admin.confirmArchiveArticle'))) return;
  try {
    article.value = await api.articles.archive(article.value.id);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

onMounted(loadArticle);
</script>

<template>
  <section class="article-detail">
    <RouterLink class="back-link" :to="{ name: 'admin-articles' }">{{
      t('admin.backToArticles')
    }}</RouterLink>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!article" class="muted">{{ t('admin.loading') }}</p>

    <template v-else>
      <header class="detail-header">
        <div>
          <p class="muted">
            {{ article.originalLang }}
            <template v-if="sourceUrl">
              ·
              <a :href="sourceUrl" target="_blank" rel="noopener noreferrer">{{
                article.source?.name ?? t('admin.source')
              }}</a>
            </template>
          </p>
          <h1>{{ t('admin.articleDetail') }}</h1>
        </div>
        <span class="status-badge">{{ statusLabel(article.status) }}</span>
      </header>

      <button
        v-if="article.status === 'DRAFT'"
        type="button"
        class="publish-button"
        @click="publishArticle"
      >
        {{ t('admin.publish') }}
      </button>
      <button
        v-if="article.status === 'PUBLISHED'"
        type="button"
        class="archive-button"
        @click="archiveArticle"
      >
        {{ t('admin.archive') }}
      </button>

      <section class="editable-section" @click="startEdit('slug')">
        <h2>{{ t('admin.slug') }}</h2>
        <label v-if="editingField === 'slug'" class="sr-only" for="detail-slug">{{
          t('admin.slug')
        }}</label>
        <input
          v-if="editingField === 'slug'"
          id="detail-slug"
          v-model="form.slug"
          pattern="[a-z0-9-]+"
          minlength="3"
          @click.stop
        />
        <p v-else>{{ form.slug }}</p>
      </section>

      <section class="editable-section" @click="startEdit('title')">
        <h2>{{ t('admin.title') }}</h2>
        <label v-if="editingField === 'title'" class="sr-only" for="detail-title">{{
          t('admin.title')
        }}</label>
        <input
          v-if="editingField === 'title'"
          id="detail-title"
          v-model="form.title"
          minlength="3"
          @click.stop
        />
        <p v-else>{{ form.title }}</p>
      </section>

      <section class="editable-section" @click="startEdit('summary')">
        <h2>{{ t('admin.summary') }}</h2>
        <label v-if="editingField === 'summary'" class="sr-only" for="detail-summary">{{
          t('admin.summary')
        }}</label>
        <textarea
          v-if="editingField === 'summary'"
          id="detail-summary"
          v-model="form.summary"
          minlength="10"
          rows="4"
          @click.stop
        />
        <p v-else>{{ form.summary }}</p>
      </section>

      <section class="editable-section" @click="startEdit('analysis')">
        <h2>{{ t('admin.analysis') }}</h2>
        <label v-if="editingField === 'analysis'" class="sr-only" for="detail-analysis">{{
          t('admin.analysis')
        }}</label>
        <textarea
          v-if="editingField === 'analysis'"
          id="detail-analysis"
          v-model="form.analysis"
          minlength="10"
          rows="8"
          @click.stop
        />
        <p v-else>{{ form.analysis }}</p>
      </section>

      <section class="editable-section" @click="startEdit('categories')">
        <h2>{{ t('admin.categories') }}</h2>
        <div v-if="editingField === 'categories'" @click.stop>
          <div class="checkbox-group">
            <label v-for="cat in categories" :key="cat.id" class="checkbox-label">
              <input
                v-model="form.categoryIds"
                type="checkbox"
                :value="cat.id"
                class="checkbox-input"
              />
              <span class="checkbox-text">{{ getCategoryLabel(cat) }}</span>
            </label>
            <span v-if="categories.length === 0" class="muted">{{ t('admin.noCategories') }}</span>
          </div>
          <button
            type="button"
            class="secondary-button"
            @click="isAddingCategory = !isAddingCategory"
          >
            {{ t('admin.addCategory') }}
          </button>

          <div v-if="isAddingCategory" class="nested-form">
            <label for="detail-cat-fr">{{ t('admin.labelFr') }}</label>
            <input
              id="detail-cat-fr"
              v-model="categoryForm.labelFr"
              required
              @input="onCategoryLabelFrInput"
            />

            <label for="detail-cat-en">{{ t('admin.labelEn') }}</label>
            <input id="detail-cat-en" v-model="categoryForm.labelEn" required />

            <label for="detail-cat-ru">{{ t('admin.labelRu') }}</label>
            <input id="detail-cat-ru" v-model="categoryForm.labelRu" required />

            <label for="detail-cat-key">{{ t('admin.key') }}</label>
            <input id="detail-cat-key" v-model="categoryForm.key" required />

            <button type="button" :disabled="isCategorySubmitting" @click="onCreateCategory">
              {{ t('admin.saveCategory') }}
            </button>
          </div>
        </div>
        <div v-else class="tags-list">
          <span v-for="cat in articleCategories" :key="cat.id" class="category-tag">
            {{ getCategoryLabel(cat) }}
          </span>
          <span v-if="articleCategories.length === 0" class="muted">{{
            t('admin.noCategories')
          }}</span>
        </div>
      </section>

      <div v-if="editingField" class="detail-actions">
        <button type="button" :disabled="isSaving" @click="saveField">{{ t('admin.save') }}</button>
        <button type="button" :disabled="isSaving" @click="cancelEdit">
          {{ t('admin.cancel') }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.article-detail {
  max-width: 760px;
}
.back-link {
  display: inline-block;
  margin-bottom: 1rem;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
}
.muted {
  color: var(--color-muted, #6b7280);
}
.error {
  color: #b91c1c;
}
.status-badge {
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  background: var(--color-border, #e5e7eb);
  font-size: 0.85rem;
  font-weight: 650;
}
.publish-button {
  margin-top: 1rem;
  background: #166534;
}
.archive-button {
  margin: 1rem 0 0 0.5rem;
  background: var(--color-copper, #a87332);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.editable-section {
  margin-top: 1.25rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  cursor: text;
}
.editable-section h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
.editable-section p {
  margin: 0;
  white-space: pre-wrap;
}
.editable-section input,
.editable-section textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem;
  font: inherit;
}
.detail-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.checkbox-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;
  justify-content: flex-start;
  gap: 0.4rem;
  padding: 0.6rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  background: var(--color-bg, #ffffff);
  max-height: 180px;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  text-align: left;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  margin: 0;
  font-weight: normal;
  width: 100%;
  text-align: left;
  justify-content: flex-start;
  align-self: stretch;
}
.checkbox-input {
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
}
.checkbox-text {
  user-select: none;
  text-align: left;
}
.nested-form {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--color-bg-muted, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.nested-form label {
  font-size: 0.8rem;
  font-weight: 600;
}
.nested-form input {
  padding: 0.4rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
}
.secondary-button {
  background: #4b5563;
  color: white;
  padding: 0.35rem 0.7rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
}
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.category-tag {
  background: var(--color-bg-muted, #e5e7eb);
  color: var(--color-text, #374151);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}
</style>

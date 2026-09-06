<script setup lang="ts">
import type { AdminArticle } from '@orbis-fidei/types';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';

import { ApiError, api } from '@/services/api';

const { t } = useI18n();
const route = useRoute();
const article = ref<AdminArticle | null>(null);
const error = ref<string | null>(null);
const editingField = ref<'title' | 'summary' | 'analysis' | null>(null);
const isSaving = ref(false);
const form = reactive({ title: '', summary: '', analysis: '' });

const originalTranslation = computed(() => {
  if (!article.value) return undefined;
  return (
    article.value.translations.find((item) => item.language === article.value?.originalLang) ??
    article.value.translations[0]
  );
});

function statusLabel(status: string): string {
  const key = `articleStatuses.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

async function loadArticle() {
  try {
    article.value = await api.articles.get(String(route.params.id));
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

function startEdit(field: 'title' | 'summary' | 'analysis') {
  editingField.value = field;
}

function cancelEdit() {
  editingField.value = null;
  const translation = originalTranslation.value;
  if (translation) {
    form.title = translation.title;
    form.summary = translation.summary;
    form.analysis = translation.analysis;
  }
}

async function saveField() {
  if (!article.value || !originalTranslation.value || !editingField.value) return;
  isSaving.value = true;
  error.value = null;
  try {
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
          <p class="muted">{{ article.slug }} · {{ article.originalLang }}</p>
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
</style>

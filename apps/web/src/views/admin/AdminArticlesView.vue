<script setup lang="ts">
import type { AdminArticle, AdminSource } from '@orbis-fidei/types';
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { api, ApiError } from '@/services/api';

const { t } = useI18n();
const router = useRouter();

const articles = ref<AdminArticle[]>([]);
const sources = ref<AdminSource[]>([]);
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const statusFilter = ref('ALL');
const isAddingSource = ref(false);
const isSourceSubmitting = ref(false);

const form = reactive({
  slug: '',
  sourceId: '',
  originalLang: 'FR' as 'FR' | 'EN' | 'RU',
  title: '',
  summary: '',
  analysis: '',
});

const sourceForm = reactive({
  name: '',
  url: '',
  language: 'FR' as 'FR' | 'EN' | 'RU',
  type: 'RSS' as 'RSS' | 'ATOM' | 'API' | 'OTHER',
});

async function loadArticles() {
  try {
    [articles.value, sources.value] = await Promise.all([api.articles.list(), api.sources.list()]);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

async function onCreate() {
  error.value = null;
  isSubmitting.value = true;
  try {
    await api.articles.create({
      slug: form.slug,
      sourceId: form.sourceId,
      originalLang: form.originalLang,
      categoryIds: [],
      translations: [
        {
          language: form.originalLang,
          title: form.title,
          summary: form.summary,
          analysis: form.analysis,
        },
      ],
    });
    form.slug = '';
    form.sourceId = '';
    form.title = '';
    form.summary = '';
    form.analysis = '';
    await loadArticles();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    isSubmitting.value = false;
  }
}

async function onCreateSource() {
  error.value = null;
  isSourceSubmitting.value = true;
  try {
    const source = await api.sources.create({
      ...sourceForm,
      fetchIntervalMin: 60,
      status: 'ACTIVE',
    });
    sources.value.push(source);
    form.sourceId = source.id;
    sourceForm.name = '';
    sourceForm.url = '';
    isAddingSource.value = false;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    isSourceSubmitting.value = false;
  }
}

function statusLabel(status: string): string {
  const key = `articleStatuses.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

async function deleteArticle(id: string) {
  if (!window.confirm(t('admin.confirmDeleteArticle'))) return;
  try {
    await api.articles.remove(id);
    await loadArticles();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

onMounted(loadArticles);
</script>

<template>
  <section>
    <h1>{{ t('admin.articles') }}</h1>

    <form class="stacked-form" @submit.prevent="onCreate">
      <label for="article-slug">{{ t('admin.slug') }}</label>
      <input
        id="article-slug"
        v-model="form.slug"
        pattern="[a-z0-9-]+"
        minlength="3"
        :title="t('admin.slugHint')"
        required
      />
      <small class="field-hint">{{ t('admin.slugHint') }}</small>

      <label for="article-source">{{ t('admin.source') }}</label>
      <select id="article-source" v-model="form.sourceId" required>
        <option disabled value="">{{ t('admin.selectSource') }}</option>
        <option
          v-for="source in sources.filter((item) => item.status === 'ACTIVE')"
          :key="source.id"
          :value="source.id"
        >
          {{ source.name }}
        </option>
      </select>
      <button type="button" class="secondary-button" @click="isAddingSource = !isAddingSource">
        {{ t('admin.addSource') }}
      </button>
      <small
        v-if="sources.filter((item) => item.status === 'ACTIVE').length === 0"
        class="field-hint"
      >
        {{ t('admin.noActiveSources') }}
      </small>

      <div v-if="isAddingSource" class="nested-form">
        <label for="article-source-name">{{ t('admin.name') }}</label>
        <input id="article-source-name" v-model="sourceForm.name" required />
        <label for="article-source-url">{{ t('admin.url') }}</label>
        <input id="article-source-url" v-model="sourceForm.url" type="url" required />
        <label for="article-source-language">{{ t('admin.language') }}</label>
        <select id="article-source-language" v-model="sourceForm.language">
          <option value="FR">FR</option>
          <option value="EN">EN</option>
          <option value="RU">RU</option>
        </select>
        <label for="article-source-type">{{ t('admin.type') }}</label>
        <select id="article-source-type" v-model="sourceForm.type">
          <option value="RSS">RSS</option>
          <option value="ATOM">Atom</option>
          <option value="API">API</option>
          <option value="OTHER">Other</option>
        </select>
        <button type="button" :disabled="isSourceSubmitting" @click="onCreateSource">
          {{ t('admin.saveSource') }}
        </button>
      </div>

      <label for="article-lang">{{ t('admin.originalLang') }}</label>
      <select id="article-lang" v-model="form.originalLang">
        <option value="FR">FR</option>
        <option value="EN">EN</option>
        <option value="RU">RU</option>
      </select>

      <label for="article-title">{{ t('admin.title') }}</label>
      <input id="article-title" v-model="form.title" minlength="3" required />

      <label for="article-summary">{{ t('admin.summary') }}</label>
      <textarea id="article-summary" v-model="form.summary" minlength="10" required></textarea>

      <label for="article-analysis">{{ t('admin.analysis') }}</label>
      <textarea id="article-analysis" v-model="form.analysis" minlength="10" required></textarea>

      <div class="form-actions">
        <button type="submit" :disabled="isSubmitting">{{ t('admin.create') }}</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <label for="article-status-filter">{{ t('admin.filterStatus') }}</label>
    <select id="article-status-filter" v-model="statusFilter" class="status-filter">
      <option value="ALL">{{ t('admin.allStatuses') }}</option>
      <option value="DRAFT">{{ statusLabel('DRAFT') }}</option>
      <option value="PUBLISHED">{{ statusLabel('PUBLISHED') }}</option>
      <option value="ARCHIVED">{{ statusLabel('ARCHIVED') }}</option>
    </select>

    <p v-if="articles.length === 0">{{ t('admin.noArticles') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('admin.slug') }}</th>
          <th>{{ t('admin.status') }}</th>
          <th>{{ t('admin.originalLang') }}</th>
          <th>{{ t('admin.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="article in articles.filter(
            (item) => statusFilter === 'ALL' || item.status === statusFilter,
          )"
          :key="article.id"
        >
          <td>{{ article.slug }}</td>
          <td>{{ statusLabel(article.status) }}</td>
          <td>{{ article.originalLang }}</td>
          <td class="article-actions">
            <button
              type="button"
              class="icon-button view"
              :aria-label="t('admin.view')"
              :title="t('admin.view')"
              @click="router.push({ name: 'admin-article-detail', params: { id: article.id } })"
            >
              ◉
            </button>
            <button
              type="button"
              class="icon-button danger"
              :aria-label="t('admin.delete')"
              :title="t('admin.delete')"
              @click="deleteArticle(article.id)"
            >
              🗑
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.status-filter {
  margin: 0.5rem 0 1rem;
  padding: 0.4rem 0.6rem;
}

.article-actions {
  white-space: nowrap;
}

.icon-button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.danger {
  margin-left: 0.35rem;
  background: #991b1b;
}
</style>

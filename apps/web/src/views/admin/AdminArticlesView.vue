<script setup lang="ts">
import type { AdminArticle } from '@orbis-fidei/types';
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { api, ApiError } from '@/services/api';

const { t } = useI18n();

const articles = ref<AdminArticle[]>([]);
const error = ref<string | null>(null);
const isSubmitting = ref(false);

const form = reactive({
  slug: '',
  originalLang: 'FR' as 'FR' | 'EN' | 'RU',
  title: '',
  summary: '',
  analysis: '',
});

async function loadArticles() {
  try {
    articles.value = await api.articles.list();
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

onMounted(loadArticles);
</script>

<template>
  <section>
    <h1>{{ t('admin.articles') }}</h1>

    <form class="stacked-form" @submit.prevent="onCreate">
      <label for="article-slug">{{ t('admin.slug') }}</label>
      <input id="article-slug" v-model="form.slug" required />

      <label for="article-lang">{{ t('admin.originalLang') }}</label>
      <select id="article-lang" v-model="form.originalLang">
        <option value="FR">FR</option>
        <option value="EN">EN</option>
        <option value="RU">RU</option>
      </select>

      <label for="article-title">{{ t('admin.title') }}</label>
      <input id="article-title" v-model="form.title" required />

      <label for="article-summary">{{ t('admin.summary') }}</label>
      <textarea id="article-summary" v-model="form.summary" required></textarea>

      <label for="article-analysis">{{ t('admin.analysis') }}</label>
      <textarea id="article-analysis" v-model="form.analysis" required></textarea>

      <button type="submit" :disabled="isSubmitting">{{ t('admin.create') }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="articles.length === 0">{{ t('admin.noArticles') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('admin.slug') }}</th>
          <th>{{ t('admin.status') }}</th>
          <th>{{ t('admin.originalLang') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="article in articles" :key="article.id">
          <td>{{ article.slug }}</td>
          <td>{{ article.status }}</td>
          <td>{{ article.originalLang }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

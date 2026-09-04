<script setup lang="ts">
import type { AdminSource } from '@orbis-fidei/types';
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { api, ApiError } from '@/services/api';

const { t } = useI18n();

const sources = ref<AdminSource[]>([]);
const error = ref<string | null>(null);
const isSubmitting = ref(false);

const form = reactive({
  name: '',
  url: '',
  language: 'FR' as 'FR' | 'EN' | 'RU',
  type: 'RSS' as 'RSS' | 'ATOM' | 'API' | 'OTHER',
});

async function loadSources() {
  try {
    sources.value = await api.sources.list();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

async function onCreate() {
  error.value = null;
  isSubmitting.value = true;
  try {
    await api.sources.create({
      name: form.name,
      url: form.url,
      language: form.language,
      type: form.type,
      fetchIntervalMin: 60,
      status: 'ACTIVE',
    });
    form.name = '';
    form.url = '';
    await loadSources();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    isSubmitting.value = false;
  }
}

async function onDelete(id: string) {
  try {
    await api.sources.remove(id);
    await loadSources();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

onMounted(loadSources);
</script>

<template>
  <section>
    <h1>{{ t('admin.sources') }}</h1>

    <form class="inline-form" @submit.prevent="onCreate">
      <label for="source-name" class="sr-only">{{ t('admin.name') }}</label>
      <input id="source-name" v-model="form.name" :placeholder="t('admin.name')" required />

      <label for="source-url" class="sr-only">{{ t('admin.url') }}</label>
      <input id="source-url" v-model="form.url" type="url" :placeholder="t('admin.url')" required />

      <label for="source-language" class="sr-only">{{ t('admin.language') }}</label>
      <select id="source-language" v-model="form.language">
        <option value="FR">FR</option>
        <option value="EN">EN</option>
        <option value="RU">RU</option>
      </select>

      <label for="source-type" class="sr-only">{{ t('admin.type') }}</label>
      <select id="source-type" v-model="form.type">
        <option value="RSS">RSS</option>
        <option value="ATOM">Atom</option>
        <option value="API">API</option>
        <option value="OTHER">Other</option>
      </select>

      <button type="submit" :disabled="isSubmitting">{{ t('admin.create') }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="sources.length === 0">{{ t('admin.noSources') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('admin.name') }}</th>
          <th>{{ t('admin.url') }}</th>
          <th>{{ t('admin.language') }}</th>
          <th>{{ t('admin.type') }}</th>
          <th>{{ t('admin.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="source in sources" :key="source.id">
          <td>{{ source.name }}</td>
          <td>{{ source.url }}</td>
          <td>{{ source.language }}</td>
          <td>{{ source.type }}</td>
          <td>
            <button type="button" @click="onDelete(source.id)">{{ t('admin.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

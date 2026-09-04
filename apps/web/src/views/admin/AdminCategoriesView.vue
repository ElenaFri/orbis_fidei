<script setup lang="ts">
import type { AdminCategory } from '@orbis-fidei/types';
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { api, ApiError } from '@/services/api';

const { t } = useI18n();

const categories = ref<AdminCategory[]>([]);
const error = ref<string | null>(null);
const isSubmitting = ref(false);

const form = reactive({
  key: '',
  labelFr: '',
  labelEn: '',
  labelRu: '',
});

async function loadCategories() {
  try {
    categories.value = await api.categories.list();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

async function onCreate() {
  error.value = null;
  isSubmitting.value = true;
  try {
    await api.categories.create({ ...form });
    form.key = '';
    form.labelFr = '';
    form.labelEn = '';
    form.labelRu = '';
    await loadCategories();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    isSubmitting.value = false;
  }
}

async function onDelete(id: string) {
  try {
    await api.categories.remove(id);
    await loadCategories();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

onMounted(loadCategories);
</script>

<template>
  <section>
    <h1>{{ t('admin.categories') }}</h1>

    <form class="inline-form" @submit.prevent="onCreate">
      <label for="category-key" class="sr-only">{{ t('admin.key') }}</label>
      <input id="category-key" v-model="form.key" :placeholder="t('admin.key')" required />

      <label for="category-fr" class="sr-only">{{ t('admin.labelFr') }}</label>
      <input id="category-fr" v-model="form.labelFr" :placeholder="t('admin.labelFr')" required />

      <label for="category-en" class="sr-only">{{ t('admin.labelEn') }}</label>
      <input id="category-en" v-model="form.labelEn" :placeholder="t('admin.labelEn')" required />

      <label for="category-ru" class="sr-only">{{ t('admin.labelRu') }}</label>
      <input id="category-ru" v-model="form.labelRu" :placeholder="t('admin.labelRu')" required />

      <button type="submit" :disabled="isSubmitting">{{ t('admin.create') }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="categories.length === 0">{{ t('admin.noCategories') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('admin.key') }}</th>
          <th>{{ t('admin.labelFr') }}</th>
          <th>{{ t('admin.labelEn') }}</th>
          <th>{{ t('admin.labelRu') }}</th>
          <th>{{ t('admin.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="category in categories" :key="category.id">
          <td>{{ category.key }}</td>
          <td>{{ category.labelFr }}</td>
          <td>{{ category.labelEn }}</td>
          <td>{{ category.labelRu }}</td>
          <td>
            <button type="button" @click="onDelete(category.id)">{{ t('admin.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

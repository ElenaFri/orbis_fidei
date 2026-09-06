<script setup lang="ts">
import type { AdminCategory } from '@orbis-fidei/types';
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { api, ApiError } from '@/services/api';

const { t } = useI18n();

const categories = ref<AdminCategory[]>([]);
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const editingId = ref<string | null>(null);

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

function startEdit(category: AdminCategory) {
  editingId.value = category.id;
  form.key = category.key;
  form.labelFr = category.labelFr;
  form.labelEn = category.labelEn;
  form.labelRu = category.labelRu;
  error.value = null;
}

function cancelEdit() {
  editingId.value = null;
  form.key = '';
  form.labelFr = '';
  form.labelEn = '';
  form.labelRu = '';
}

async function onUpdate() {
  if (!editingId.value) return;
  error.value = null;
  isSubmitting.value = true;
  try {
    await api.categories.update(editingId.value, { ...form });
    cancelEdit();
    await loadCategories();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    isSubmitting.value = false;
  }
}

async function onDelete(id: string) {
  error.value = null;
  if (!window.confirm(t('admin.confirmDeleteCategory'))) return;
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

    <form class="stacked-form category-form" @submit.prevent="editingId ? onUpdate() : onCreate()">
      <label for="category-key" class="sr-only">{{ t('admin.key') }}</label>
      <input id="category-key" v-model="form.key" :placeholder="t('admin.key')" required />

      <label for="category-fr" class="sr-only">{{ t('admin.labelFr') }}</label>
      <input id="category-fr" v-model="form.labelFr" :placeholder="t('admin.labelFr')" required />

      <label for="category-en" class="sr-only">{{ t('admin.labelEn') }}</label>
      <input id="category-en" v-model="form.labelEn" :placeholder="t('admin.labelEn')" required />

      <label for="category-ru" class="sr-only">{{ t('admin.labelRu') }}</label>
      <input id="category-ru" v-model="form.labelRu" :placeholder="t('admin.labelRu')" required />

      <div class="form-actions">
        <button type="submit" :disabled="isSubmitting">
          {{ editingId ? t('admin.save') : t('admin.create') }}
        </button>
        <button v-if="editingId" type="button" :disabled="isSubmitting" @click="cancelEdit">
          {{ t('admin.cancel') }}
        </button>
      </div>
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
            <div class="action-buttons">
              <button
                type="button"
                class="icon-button edit"
                :aria-label="t('admin.edit')"
                :title="t('admin.edit')"
                @click="startEdit(category)"
              >
                ✏
              </button>
              <button
                type="button"
                class="icon-button danger"
                :aria-label="t('admin.delete')"
                :title="t('admin.delete')"
                @click="onDelete(category.id)"
              >
                🗑
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.danger {
  background: #991b1b;
}

.action-buttons {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
}

.icon-button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
}

.category-form {
  max-width: 480px;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.icon-button.edit {
  background: var(--color-accent, #1e40af);
}
</style>

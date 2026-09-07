<script setup lang="ts">
import type { PublicComment } from '@orbis-fidei/types';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CommentItem from '@/components/CommentItem.vue';
import { ApiError, api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{ articleId: string }>();
const { t } = useI18n();
const auth = useAuthStore();

const comments = ref<PublicComment[]>([]);
const content = ref('');
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const showAllComments = ref(false);

const visibleComments = computed(() => {
  if (showAllComments.value || comments.value.length <= 3) {
    return comments.value;
  }
  return comments.value.slice(0, 3);
});

async function loadComments() {
  try {
    comments.value = await api.comments.list(props.articleId);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('comments.loadError');
  }
}

async function submitComment() {
  if (!content.value.trim()) return;
  isSubmitting.value = true;
  error.value = null;
  try {
    await api.comments.create(props.articleId, content.value.trim());
    content.value = '';
    await loadComments();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('comments.postError');
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(loadComments);
</script>

<template>
  <section class="comments">
    <h2>{{ t('comments.title') }}</h2>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="comments.length === 0 && !error" class="muted">{{ t('comments.empty') }}</p>

    <div v-else class="comment-thread-container">
      <ol class="comment-list">
        <CommentItem
          v-for="comment in visibleComments"
          :key="comment.id"
          :comment="comment"
          :depth="0"
          @refresh="loadComments"
        />
      </ol>

      <button
        v-if="comments.length > 3"
        type="button"
        class="btn-expand-all"
        @click="showAllComments = !showAllComments"
      >
        {{
          showAllComments
            ? t('comments.showLess')
            : t('comments.showMore', { count: comments.length - 3 })
        }}
      </button>
    </div>

    <form v-if="auth.isAuthenticated" class="comment-form" @submit.prevent="submitComment">
      <label for="comment-content">{{ t('comments.write') }}</label>
      <textarea id="comment-content" v-model="content" rows="3" required />
      <button type="submit" :disabled="isSubmitting">{{ t('comments.submit') }}</button>
    </form>
    <p v-else class="muted">{{ t('comments.loginRequired') }}</p>
  </section>
</template>

<style scoped>
.comments {
  margin-top: 2rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  padding-top: 1.5rem;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0;
  list-style: none;
}

.btn-expand-all {
  margin-top: 1rem;
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--color-bg-muted, #f3f4f6);
  color: var(--color-text, #374151);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-expand-all:hover {
  background: var(--color-border, #e5e7eb);
}

.comment-form {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 560px;
}

.comment-form textarea {
  resize: vertical;
  padding: 0.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  font: inherit;
}

.comment-form button {
  align-self: flex-start;
}

.muted {
  color: var(--color-muted, #6b7280);
}

.error {
  color: #b91c1c;
}
</style>

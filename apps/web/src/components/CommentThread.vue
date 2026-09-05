<script setup lang="ts">
import type { PublicComment } from '@orbis-fidei/types';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { ApiError, api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{ articleId: string }>();
const { t } = useI18n();
const auth = useAuthStore();
const comments = ref<PublicComment[]>([]);
const content = ref('');
const error = ref<string | null>(null);
const isSubmitting = ref(false);

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

    <ol v-else class="comment-list">
      <li v-for="comment in comments" :key="comment.id" class="comment">
        <strong>{{ comment.author.displayName }}</strong>
        <time :datetime="comment.createdAt">{{
          new Date(comment.createdAt).toLocaleDateString()
        }}</time>
        <p>{{ comment.content }}</p>
        <ol v-if="comment.replies?.length" class="replies">
          <li v-for="reply in comment.replies" :key="reply.id" class="comment">
            <strong>{{ reply.author.displayName }}</strong>
            <p>{{ reply.content }}</p>
          </li>
        </ol>
      </li>
    </ol>

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

.comment-list,
.replies {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0;
  list-style: none;
}

.comment {
  padding: 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
}

.comment time {
  margin-left: 0.5rem;
  color: var(--color-muted, #6b7280);
  font-size: 0.8rem;
}

.comment p {
  margin: 0.5rem 0 0;
}

.replies {
  margin: 0.75rem 0 0 1rem;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 560px;
}

.comment-form textarea {
  resize: vertical;
  padding: 0.5rem;
  font: inherit;
}

.comment-form button {
  align-self: flex-start;
}

.muted,
.error {
  color: var(--color-muted, #6b7280);
}

.error {
  color: #b91c1c;
}
</style>

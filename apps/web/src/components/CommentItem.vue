<script setup lang="ts">
import type { PublicComment } from '@orbis-fidei/types';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { ApiError, api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

defineOptions({
  name: 'CommentItem',
});

const props = withDefaults(
  defineProps<{
    comment: PublicComment;
    depth?: number;
  }>(),
  {
    depth: 0,
  },
);

const emit = defineEmits<{
  refresh: [];
}>();

const { t, locale } = useI18n();
const auth = useAuthStore();

const isReplying = ref(false);
const replyContent = ref('');
const isSubmittingReply = ref(false);

const isEditing = ref(false);
const editContent = ref('');
const isSubmittingEdit = ref(false);

const showAllReplies = ref(false);
const itemError = ref<string | null>(null);

const visibleReplies = computed(() => {
  const replies = props.comment.replies ?? [];
  if (showAllReplies.value || replies.length <= 3) {
    return replies;
  }
  return replies.slice(0, 3);
});

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function canEdit(comment: PublicComment): boolean {
  return Boolean(auth.isAuthenticated && auth.user?.id === comment.authorId);
}

function canDelete(comment: PublicComment): boolean {
  return Boolean(
    auth.isAuthenticated &&
    (auth.user?.id === comment.authorId || auth.hasPermission('comment.moderate')),
  );
}

function toggleReply() {
  isReplying.value = !isReplying.value;
  replyContent.value = '';
  isEditing.value = false;
  itemError.value = null;
}

function cancelReply() {
  isReplying.value = false;
  replyContent.value = '';
  itemError.value = null;
}

async function submitReply() {
  if (!replyContent.value.trim()) return;
  isSubmittingReply.value = true;
  itemError.value = null;
  try {
    await api.comments.create(props.comment.articleId, replyContent.value.trim(), props.comment.id);
    isReplying.value = false;
    replyContent.value = '';
    emit('refresh');
  } catch (err) {
    itemError.value = err instanceof ApiError ? err.message : t('comments.postError');
  } finally {
    isSubmittingReply.value = false;
  }
}

function startEdit() {
  isEditing.value = true;
  editContent.value = props.comment.content;
  isReplying.value = false;
  itemError.value = null;
}

function cancelEdit() {
  isEditing.value = false;
  editContent.value = '';
  itemError.value = null;
}

async function submitEdit() {
  if (!editContent.value.trim()) return;
  isSubmittingEdit.value = true;
  itemError.value = null;
  try {
    await api.comments.update(props.comment.id, editContent.value.trim());
    isEditing.value = false;
    editContent.value = '';
    emit('refresh');
  } catch (err) {
    itemError.value = err instanceof ApiError ? err.message : t('comments.postError');
  } finally {
    isSubmittingEdit.value = false;
  }
}

async function deleteComment() {
  if (!window.confirm(t('comments.confirmDelete'))) return;
  itemError.value = null;
  try {
    await api.comments.remove(props.comment.id);
    emit('refresh');
  } catch (err) {
    itemError.value = err instanceof ApiError ? err.message : t('comments.loadError');
  }
}
</script>

<template>
  <li class="comment-item" :class="{ 'is-reply': depth > 0 }">
    <header class="comment-header">
      <strong class="author-name">{{ comment.author.displayName }}</strong>
      <time class="comment-time" :datetime="comment.createdAt">
        {{ formatDateTime(comment.createdAt) }}
      </time>
    </header>

    <p v-if="itemError" class="error">{{ itemError }}</p>

    <!-- Edit mode -->
    <form v-if="isEditing" class="comment-form-inline" @submit.prevent="submitEdit">
      <label class="sr-only" :for="`edit-content-${comment.id}`">{{ t('comments.edit') }}</label>
      <textarea :id="`edit-content-${comment.id}`" v-model="editContent" rows="3" required />
      <div class="form-actions">
        <button type="submit" :disabled="isSubmittingEdit">{{ t('comments.save') }}</button>
        <button type="button" class="btn-cancel" @click="cancelEdit">
          {{ t('comments.cancel') }}
        </button>
      </div>
    </form>

    <!-- Display mode -->
    <p v-else class="comment-body">{{ comment.content }}</p>

    <!-- Comment Actions -->
    <footer class="comment-actions">
      <button v-if="auth.isAuthenticated" type="button" class="btn-action" @click="toggleReply">
        {{ t('comments.reply') }}
      </button>
      <button v-if="canEdit(comment)" type="button" class="btn-action" @click="startEdit">
        {{ t('comments.edit') }}
      </button>
      <button
        v-if="canDelete(comment)"
        type="button"
        class="btn-action btn-danger"
        @click="deleteComment"
      >
        {{ t('comments.delete') }}
      </button>
    </footer>

    <!-- Reply Form -->
    <form v-if="isReplying" class="comment-form-inline reply-box" @submit.prevent="submitReply">
      <label class="sr-only" :for="`reply-content-${comment.id}`">{{
        t('comments.writeReply')
      }}</label>
      <textarea
        :id="`reply-content-${comment.id}`"
        v-model="replyContent"
        :placeholder="t('comments.writeReply')"
        rows="2"
        required
      />
      <div class="form-actions">
        <button type="submit" :disabled="isSubmittingReply">{{ t('comments.submit') }}</button>
        <button type="button" class="btn-cancel" @click="cancelReply">
          {{ t('comments.cancel') }}
        </button>
      </div>
    </form>

    <!-- Nested Replies (Recursive) -->
    <div v-if="comment.replies && comment.replies.length > 0" class="replies-container">
      <ol class="replies-list">
        <CommentItem
          v-for="reply in visibleReplies"
          :key="reply.id"
          :comment="reply"
          :depth="depth + 1"
          @refresh="emit('refresh')"
        />
      </ol>

      <button
        v-if="comment.replies.length > 3"
        type="button"
        class="btn-expand"
        @click="showAllReplies = !showAllReplies"
      >
        {{
          showAllReplies
            ? t('comments.showLessReplies')
            : t('comments.showMoreReplies', { count: comment.replies.length - 3 })
        }}
      </button>
    </div>
  </li>
</template>

<style scoped>
.comment-item {
  padding: 0.85rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  background-color: var(--color-bg, #ffffff);
  list-style: none;
}

.comment-item.is-reply {
  background-color: var(--color-bg-muted, #f9fafb);
  border-color: var(--color-border, #e5e7eb);
}

.comment-header {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.author-name {
  font-weight: 600;
  color: var(--color-text, #111827);
}

.comment-time {
  color: var(--color-muted, #6b7280);
  font-size: 0.8rem;
}

.comment-body {
  margin: 0.5rem 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  line-height: 1.5;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-top: 0.4rem;
}

.btn-action {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent, #1e40af);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-action:hover {
  text-decoration: underline;
}

.btn-danger {
  color: #b91c1c;
}

.comment-form-inline {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comment-form-inline textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  font: inherit;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-cancel {
  background: var(--color-muted, #6b7280);
}

.replies-container {
  margin-top: 0.85rem;
  padding-left: 1rem;
  border-left: 2px solid var(--color-border, #d1d5db);
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
  margin: 0;
}

.btn-expand {
  margin-top: 0.5rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--color-bg-muted, #f3f4f6);
  color: var(--color-text, #374151);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-expand:hover {
  background: var(--color-border, #e5e7eb);
}

.error {
  color: #b91c1c;
  font-size: 0.85rem;
  margin: 0.25rem 0;
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
</style>

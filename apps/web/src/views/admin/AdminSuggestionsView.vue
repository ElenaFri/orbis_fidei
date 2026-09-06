<script setup lang="ts">
import type { AdminProposal } from '@orbis-fidei/types';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { ApiError, api } from '@/services/api';

const { t } = useI18n();
const proposals = ref<AdminProposal[]>([]);
const error = ref<string | null>(null);
const busyId = ref<string | null>(null);

async function loadProposals() {
  try {
    proposals.value = await api.proposals.list();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

async function accept(id: string) {
  busyId.value = id;
  error.value = null;
  try {
    await api.proposals.accept(id);
    await loadProposals();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    busyId.value = null;
  }
}

async function reject(id: string) {
  busyId.value = id;
  error.value = null;
  try {
    await api.proposals.reject(id);
    await loadProposals();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    busyId.value = null;
  }
}

onMounted(loadProposals);
</script>

<template>
  <section>
    <h1>{{ t('admin.suggestions') }}</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="proposals.length === 0 && !error" class="muted">{{ t('admin.noSuggestions') }}</p>

    <div v-for="proposal in proposals" :key="proposal.id" class="proposal-list">
      <article class="proposal">
        <p class="proposal-source">
          {{ proposal.sourceItem.source.name }} · {{ proposal.sourceItem.originalLanguage }}
        </p>
        <h2>{{ proposal.suggestedTitle || proposal.sourceItem.originalTitle }}</h2>
        <p>{{ proposal.suggestedSummary || proposal.sourceItem.originalContent }}</p>
        <p class="proposal-meta">
          {{ t('admin.category') }}: {{ proposal.suggestedCategory || 'other' }} ·
          {{ t('admin.confidence') }}: {{ proposal.confidence ?? 0 }}
        </p>
        <a :href="proposal.sourceItem.originalUrl" target="_blank" rel="noopener noreferrer">
          {{ t('admin.openSource') }}
        </a>
        <div class="proposal-actions">
          <button type="button" :disabled="busyId === proposal.id" @click="accept(proposal.id)">
            {{ t('admin.accept') }}
          </button>
          <button
            type="button"
            class="reject"
            :disabled="busyId === proposal.id"
            @click="reject(proposal.id)"
          >
            {{ t('admin.reject') }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.proposal-list {
  display: grid;
  gap: 1rem;
}

.proposal {
  padding: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
}

.proposal-source,
.proposal-meta,
.muted {
  color: var(--color-muted, #6b7280);
  font-size: 0.875rem;
}

.proposal h2 {
  margin: 0.4rem 0;
  font-size: 1.1rem;
}

.proposal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.reject {
  background: #991b1b;
}

.error {
  color: #b91c1c;
}
</style>

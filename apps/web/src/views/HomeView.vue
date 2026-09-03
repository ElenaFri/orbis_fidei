<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section>
    <h1>{{ t('home.title') }}</h1>
    <p class="tagline">{{ t('home.tagline') }}</p>
    <p class="empty">{{ t('home.empty') }}</p>
  </section>
</template>

<style scoped>
.tagline {
  color: var(--color-muted, #6b7280);
  font-style: italic;
}

.empty {
  margin-top: 2rem;
  padding: 2rem;
  border: 1px dashed var(--color-border, #e5e7eb);
  border-radius: 8px;
  text-align: center;
  color: var(--color-muted, #6b7280);
}
</style>

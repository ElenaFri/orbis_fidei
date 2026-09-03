<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section>
    <h1>{{ t('search.title') }}</h1>
    <label for="search-input" class="sr-only">{{ t('search.title') }}</label>
    <input
      id="search-input"
      type="search"
      :placeholder="t('search.placeholder')"
      disabled
    />
    <p class="todo">{{ t('search.todo') }}</p>
  </section>
</template>

<style scoped>
input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  font-size: 1rem;
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

.todo {
  margin-top: 1rem;
  color: var(--color-muted, #6b7280);
  font-style: italic;
}
</style>

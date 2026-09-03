<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { setLocale, type SupportedLocale } from '@/i18n';

const { locale } = useI18n();

const LOCALES: { code: SupportedLocale; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

function switchTo(code: SupportedLocale) {
  setLocale(code);
}
</script>

<template>
  <fieldset class="lang-switcher">
    <legend class="sr-only">Language</legend>
    <button
      v-for="l in LOCALES"
      :key="l.code"
      type="button"
      :class="{ active: locale === l.code }"
      @click="switchTo(l.code)"
    >
      {{ l.label }}
    </button>
  </fieldset>
</template>

<style scoped>
.lang-switcher {
  display: inline-flex;
  gap: 0.25rem;
  border: none;
  padding: 0;
  margin: 0;
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

button {
  background: none;
  border: 1px solid var(--color-border, #e5e7eb);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-muted, #6b7280);
}

button.active {
  color: var(--color-accent, #1e40af);
  border-color: var(--color-accent, #1e40af);
}
</style>

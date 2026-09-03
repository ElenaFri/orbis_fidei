<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

const { t } = useI18n();
</script>

<template>
  <section class="not-found">
    <h1>404 · {{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.message') }}</p>
    <RouterLink to="/">{{ t('notFound.back') }}</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 4rem 1rem;
}
</style>

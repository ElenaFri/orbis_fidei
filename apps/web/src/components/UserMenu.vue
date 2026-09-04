<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

const isOpen = ref(false);
const rootEl = ref<HTMLElement | null>(null);

const initials = computed(() => {
  const name = auth.user?.displayName ?? '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts.at(-1)![0]!).toUpperCase();
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function onClickOutside(event: MouseEvent) {
  if (isOpen.value && !rootEl.value?.contains(event.target as Node)) {
    close();
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));

async function onLogout() {
  close();
  await auth.logout();
  await router.push('/');
}
</script>

<template>
  <div
    ref="rootEl"
    class="user-menu"
  >
    <button
      type="button"
      class="avatar"
      :aria-expanded="isOpen"
      :aria-label="auth.user?.displayName"
      @click="toggle"
    >
      {{ initials }}
    </button>

    <div
      v-if="isOpen"
      class="dropdown"
      role="menu"
    >
      <p class="dropdown-name">
        {{ auth.user?.displayName }}
      </p>
      <button
        type="button"
        class="dropdown-action"
        role="menuitem"
        @click="onLogout"
      >
        {{ t('nav.logout') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background: var(--color-accent, #1e40af);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 160px;
  background: var(--color-bg, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 0.5rem;
  z-index: 10;
}

.dropdown-name {
  margin: 0 0 0.5rem;
  padding: 0 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #111827);
}

.dropdown-action {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.4rem 0.25rem;
  font-size: 0.875rem;
  color: var(--color-muted, #6b7280);
  cursor: pointer;
  border-radius: 4px;
}

.dropdown-action:hover {
  background: var(--color-border, #e5e7eb);
  color: var(--color-text, #111827);
}
</style>

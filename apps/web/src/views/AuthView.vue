<script setup lang="ts">
import { LoginSchema, RegisterSchema } from '@orbis-fidei/validation';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { ApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

type Mode = 'login' | 'register';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const mode = ref<Mode>('login');
const email = ref('');
const password = ref('');
const displayName = ref('');
const error = ref<string | null>(null);
const isSubmitting = ref(false);

function switchMode(next: Mode) {
  mode.value = next;
  error.value = null;
}

async function onSubmit() {
  error.value = null;

  const parsed =
    mode.value === 'login'
      ? LoginSchema.safeParse({ email: email.value, password: password.value })
      : RegisterSchema.safeParse({
          email: email.value,
          password: password.value,
          displayName: displayName.value,
        });

  if (!parsed.success) {
    error.value = t('auth.error');
    return;
  }

  isSubmitting.value = true;
  try {
    if (mode.value === 'login') {
      await auth.login(parsed.data.email, parsed.data.password);
    } else {
      await auth.register(parsed.data as { email: string; password: string; displayName: string });
    }
    await router.push('/');
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('auth.error');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="auth-view">
    <div
      class="tabs"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'login'"
        :class="{ active: mode === 'login' }"
        @click="switchMode('login')"
      >
        {{ t('auth.loginTitle') }}
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'register'"
        :class="{ active: mode === 'register' }"
        @click="switchMode('register')"
      >
        {{ t('auth.registerTitle') }}
      </button>
    </div>

    <form @submit.prevent="onSubmit">
      <template v-if="mode === 'register'">
        <label for="auth-name">{{ t('auth.displayName') }}</label>
        <input
          id="auth-name"
          v-model="displayName"
          type="text"
          autocomplete="name"
          required
        >
      </template>

      <label for="auth-email">{{ t('auth.email') }}</label>
      <input
        id="auth-email"
        v-model="email"
        type="email"
        autocomplete="email"
        required
      >

      <label for="auth-password">{{ t('auth.password') }}</label>
      <input
        id="auth-password"
        v-model="password"
        type="password"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        required
      >

      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="isSubmitting"
      >
        {{ mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister') }}
      </button>
    </form>
  </section>
</template>

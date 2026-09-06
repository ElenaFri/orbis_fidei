<script setup lang="ts">
import type { AdminRole, AdminUser } from '@orbis-fidei/types';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { ApiError, api } from '@/services/api';

const { t } = useI18n();
const users = ref<AdminUser[]>([]);
const roles = ref<AdminRole[]>([]);
const error = ref<string | null>(null);
const busyId = ref<string | null>(null);

async function load() {
  try {
    [users.value, roles.value] = await Promise.all([api.users.list(), api.users.roles()]);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  }
}

function roleIds(user: AdminUser): string[] {
  return user.roles.map(({ role }) => role.id);
}

async function updateRoles(user: AdminUser, event: Event) {
  const select = event.target as HTMLSelectElement;
  busyId.value = user.id;
  try {
    await api.users.update(user.id, {
      roleIds: [...select.selectedOptions].map((option) => option.value),
    });
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    busyId.value = null;
  }
}

async function toggleActive(user: AdminUser) {
  busyId.value = user.id;
  try {
    await api.users.update(user.id, { isActive: !user.isActive });
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('admin.error');
  } finally {
    busyId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <h1>{{ t('admin.users') }}</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="users.length === 0 && !error" class="muted">{{ t('admin.noUsers') }}</p>

    <table v-else>
      <thead>
        <tr>
          <th>{{ t('admin.name') }}</th>
          <th>{{ t('admin.email') }}</th>
          <th>{{ t('admin.roles') }}</th>
          <th>{{ t('admin.status') }}</th>
          <th>{{ t('admin.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.displayName }}</td>
          <td>{{ user.email }}</td>
          <td>
            <select
              multiple
              :value="roleIds(user)"
              :disabled="busyId === user.id"
              @change="updateRoles(user, $event)"
            >
              <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
          </td>
          <td>{{ user.isActive ? t('admin.active') : t('admin.inactive') }}</td>
          <td>
            <button type="button" :disabled="busyId === user.id" @click="toggleActive(user)">
              {{ user.isActive ? t('admin.disable') : t('admin.enable') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.error {
  color: #b91c1c;
}
.muted {
  color: var(--color-muted, #6b7280);
}
select {
  min-width: 140px;
}
</style>

<template>
  <RoleManagementModal />
  <ListPageWrapper>
    <div class="container-fluid py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">{{ t('adminManagement.title') }}</h4>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else class="card">
        <div class="card-body p-0">
          <table class="table table-hover mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ t('analytics.user') }}</th>
                <th>{{ t('auth.email') }}</th>
                <th>{{ t('adminManagement.colAdminAccess') }}</th>
                <th>{{ t('adminManagement.colPasswordSet') }}</th>
                <th>{{ t('adminManagement.colLastLogin') }}</th>
                <th>{{ t('adminManagement.colRoles') }}</th>
                <th class="text-end">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>
                  <strong>{{ user.username }}</strong>
                  <div v-if="user.firstname || user.lastname" class="small text-muted">
                    {{ user.firstname }} {{ user.lastname }}
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span v-if="user.admin_access.granted && user.admin_access.enabled" class="badge bg-success">
                    {{ t('common.active') }}
                  </span>
                  <span v-else-if="user.admin_access.granted" class="badge bg-warning">
                    {{ t('adminManagement.statusDisabled') }}
                  </span>
                  <span v-else class="badge bg-secondary">
                    {{ t('adminManagement.statusNotGranted') }}
                  </span>
                </td>
                <td>
                  <span v-if="user.admin_access.has_password" class="text-success">✓</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <span v-if="user.admin_access.last_login_at" class="small">
                    {{ formatDate(user.admin_access.last_login_at) }}
                  </span>
                  <span v-else class="text-muted small">{{ t('adminManagement.never') }}</span>
                </td>
                <td>
                  <div v-if="user.roles.length > 0">
                    <span
                      v-for="role in user.roles"
                      :key="role.id"
                      class="badge bg-primary me-1"
                    >
                      {{ role.name }}
                    </span>
                  </div>
                  <span v-else class="text-muted small">{{ t('adminManagement.noRoles') }}</span>
                </td>
                <td class="text-end">
                  <button
                    v-if="!user.admin_access.granted"
                    @click="grantAccess(user)"
                    class="btn btn-sm btn-success me-1"
                  >
                    {{ t('adminManagement.grantAccessButton') }}
                  </button>
                  <button
                    v-else-if="!user.admin_access.enabled"
                    @click="enableAccess(user)"
                    class="btn btn-sm btn-warning me-1"
                  >
                    {{ t('adminManagement.enableAccessButton') }}
                  </button>
                  <button
                    v-else
                    @click="revokeAccess(user)"
                    class="btn btn-sm btn-danger me-1"
                  >
                    {{ t('adminManagement.revokeAccessButton') }}
                  </button>
                  <button
                    @click="manageRoles(user)"
                    class="btn btn-sm btn-outline-primary"
                  >
                    {{ t('adminManagement.colRoles') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </ListPageWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '@/composables/useAuth';
import { useNotify } from '@/composables/useNotify';
import ListPageWrapper from '@/components/ListPageWrapper.vue';
import RoleManagementModal from '@/components/RoleManagementModal.vue';

const { t } = useI18n({ useScope: 'global' });
const auth = useAuth();
const { notify } = useNotify();

const users = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  await loadUsers();

  // Listen for roles update event
  window.addEventListener('roles-updated', async () => {
    await loadUsers();
  });
});

async function loadUsers() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/admin/management/users', {
      headers: auth.authHeaders(),
    });
    const json = await response.json();

    if (json.status === 'success') {
      users.value = json.users;
    } else {
      error.value = json.message || t('adminManagement.loadUsersError');
    }
  } catch (e) {
    error.value = t('roles.connectionError');
  } finally {
    loading.value = false;
  }
}

async function grantAccess(user) {
  if (!confirm(t('adminManagement.grantConfirm', { username: user.username }))) return;

  try {
    const response = await fetch('/api/admin/credential/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeaders(),
      },
      body: JSON.stringify({ user_id: user.id }),
    });
    const json = await response.json();

    if (json.status === 'success') {
      await loadUsers();
      notify(t('adminManagement.grantSuccess'), { type: 'success' });
    } else {
      notify(json.message || t('common.error'), { type: 'error' });
    }
  } catch (e) {
    notify(t('adminManagement.connectionErrorShort'), { type: 'error' });
  }
}

async function revokeAccess(user) {
  if (!confirm(t('adminManagement.revokeConfirm', { username: user.username }))) return;

  try {
    const response = await fetch(`/api/admin/credential/${user.id}`, {
      method: 'DELETE',
      headers: auth.authHeaders(),
    });
    const json = await response.json();

    if (json.status === 'success') {
      await loadUsers();
      notify(t('adminManagement.revokeSuccess'), { type: 'success' });
    } else {
      notify(json.message || t('common.error'), { type: 'error' });
    }
  } catch (e) {
    notify(t('adminManagement.connectionErrorShort'), { type: 'error' });
  }
}

function manageRoles(user) {
  window.dispatchEvent(new CustomEvent('open-role-management', { detail: { user } }));
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>

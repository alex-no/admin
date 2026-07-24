<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseLayout>
    <div :style="pageMargin" class="page-content-wrapper">
    <div class="container-fluid py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">Управління ролями</h4>
        <button @click="openCreateModal" class="btn btn-primary btn-sm">
          <i class="bi bi-plus-lg me-1"></i>Створити роль
        </button>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else class="card">
        <div class="card-body p-0">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 60px">ID</th>
                <th>Роль</th>
                <th>Slug</th>
                <th>Права доступу</th>
                <th>Батьківські ролі</th>
                <th style="width: 100px">Системна</th>
                <th style="width: 100px" class="text-end">Дії</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in roles" :key="role.id">
                <td class="text-muted">{{ role.id }}</td>
                <td>
                  <strong>{{ role.name }}</strong>
                  <div v-if="role.description" class="small text-muted">{{ role.description }}</div>
                </td>
                <td><code class="small">{{ role.slug }}</code></td>
                <td>
                  <div v-if="role.permissions.length > 0">
                    <span
                      v-for="perm in role.permissions.slice(0, 3)"
                      :key="perm.id"
                      :class="perm.effect === 'deny' ? 'badge bg-danger me-1 small' : 'badge bg-info me-1 small'"
                      style="font-size: 0.75rem"
                      :title="perm.effect === 'deny' ? 'Deny' : 'Allow'"
                    >
                      {{ perm.effect === 'deny' ? '⊘ ' : '' }}{{ perm.slug }}
                    </span>
                    <span v-if="role.permissions.length > 3" class="text-muted small">
                      +{{ role.permissions.length - 3 }} ще
                    </span>
                  </div>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td>
                  <div v-if="role.parent_roles.length > 0">
                    <span
                      v-for="parent in role.parent_roles"
                      :key="parent.id"
                      class="badge bg-secondary me-1 small"
                    >
                      {{ parent.name }}
                    </span>
                  </div>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td class="text-center">
                  <span v-if="role.is_system" class="text-success" title="Системна роль">
                    <i class="bi bi-shield-lock-fill"></i>
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="text-end">
                  <button @click="openEditModal(role)" class="btn btn-sm btn-outline-primary me-1">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    v-if="!role.is_system"
                    @click="deleteRole(role)"
                    class="btn btn-sm btn-outline-danger"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                  <span
                    v-else
                    class="text-muted small"
                    style="display: inline-block; width: 36px; text-align: center;"
                    title="Системна роль - захищена від видалення"
                  >
                    <i class="bi bi-lock-fill"></i>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>

    <!-- Modal for create/edit -->
    <BaseModal
      v-model:visible="modalVisible"
      storage-key="role-management-modal"
      :default-width="700"
      :min-width="500"
      :max-width="1200"
      :default-height="500"
      :min-height="400"
      :max-height="800"
    >
      <template #title>
        <h5 class="mb-0">{{ modalMode === 'create' ? 'Нова роль' : 'Редагувати роль' }}</h5>
      </template>

      <template #subheader>
        <ul class="nav nav-tabs border-0">
          <li class="nav-item">
            <button
              class="nav-link py-2 px-2 small text-nowrap"
              :class="{ active: activeTab === 'general' }"
              @click="activeTab = 'general'"
            >
              <i class="bi bi-info-circle me-1"></i>Загальна інформація
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link py-2 px-2 small text-nowrap"
              :class="{ active: activeTab === 'permissions' }"
              @click="activeTab = 'permissions'"
            >
              <i class="bi bi-shield-check me-1"></i>Права доступу
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link py-2 px-2 small text-nowrap"
              :class="{ active: activeTab === 'hierarchy' }"
              @click="activeTab = 'hierarchy'"
            >
              <i class="bi bi-diagram-3 me-1"></i>Ієрархія
            </button>
          </li>
        </ul>
      </template>

      <div v-if="saveError" class="alert alert-danger small mb-3">{{ saveError }}</div>

      <template v-if="selectedRole">
        <!-- General info -->
        <template v-if="activeTab === 'general'">
          <div class="mb-3">
            <label class="form-label small mb-1">Slug (унікальний код)</label>
            <input
              v-model="formData.slug"
              type="text"
              class="form-control form-control-sm"
              :readonly="modalMode === 'edit' && selectedRole.is_system"
              placeholder="moderator"
            />
            <div class="form-text small">Латиниця, підкреслення. Приклад: content_manager</div>
          </div>

          <div class="mb-3">
            <label class="form-label small mb-1">Назва</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-control form-control-sm"
              placeholder="Content Manager"
            />
          </div>

          <div class="mb-3">
            <label class="form-label small mb-1">Опис</label>
            <textarea
              v-model="formData.description"
              class="form-control form-control-sm"
              rows="3"
              placeholder="Може керувати контентом та модерувати відгуки"
            ></textarea>
          </div>

          <div v-if="selectedRole.is_system" class="alert alert-warning small">
            <i class="bi bi-exclamation-triangle me-1"></i>
            Системна роль — можна редагувати тільки назву та опис
          </div>
        </template>

        <!-- Permissions -->
        <template v-else-if="activeTab === 'permissions'">
          <div class="alert alert-info small mb-3">
            <i class="bi bi-info-circle me-1"></i>
            Виберіть права доступу для цієї ролі та встановіть effect (allow/deny)
          </div>

          <div v-if="permissionsLoading" class="text-center py-5">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          </div>

          <div v-else>
            <div v-for="module in groupedPermissions" :key="module.name" class="mb-3">
              <h6 class="mb-2">
                <strong>{{ module.name }}</strong>
                <span class="text-muted small">({{ module.permissions.length }})</span>
              </h6>
              <div v-for="perm in module.permissions" :key="perm.id" class="mb-2 d-flex align-items-start gap-2">
                <input
                  class="form-check-input mt-1"
                  type="checkbox"
                  :id="'perm-' + perm.id"
                  :checked="isPermissionSelected(perm.id)"
                  @change="togglePermission(perm.id, $event.target.checked)"
                />
                <div class="flex-grow-1">
                  <label class="form-check-label small" :for="'perm-' + perm.id">
                    <code class="small">{{ perm.slug }}</code> — {{ perm.name }}
                    <div v-if="perm.description" class="text-muted" style="font-size: 0.75rem">
                      {{ perm.description }}
                    </div>
                  </label>
                </div>
                <div v-if="isPermissionSelected(perm.id)" class="d-flex gap-2">
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      :name="'effect-' + perm.id"
                      :id="'allow-' + perm.id"
                      value="allow"
                      :checked="getPermissionEffect(perm.id) === 'allow'"
                      @change="setPermissionEffect(perm.id, 'allow')"
                    />
                    <label class="form-check-label small text-success" :for="'allow-' + perm.id">
                      Allow
                    </label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      :name="'effect-' + perm.id"
                      :id="'deny-' + perm.id"
                      value="deny"
                      :checked="getPermissionEffect(perm.id) === 'deny'"
                      @change="setPermissionEffect(perm.id, 'deny')"
                    />
                    <label class="form-check-label small text-danger" :for="'deny-' + perm.id">
                      Deny
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Hierarchy -->
        <template v-else-if="activeTab === 'hierarchy'">
          <div class="alert alert-info small mb-3">
            <i class="bi bi-info-circle me-1"></i>
            Ця роль успадковує права від батьківських ролей
          </div>

          <div v-for="role in otherRoles" :key="role.id" class="form-check mb-2">
            <input
              class="form-check-input"
              type="checkbox"
              :id="'role-' + role.id"
              :value="role.id"
              v-model="selectedParents"
            />
            <label class="form-check-label" :for="'role-' + role.id">
              <strong>{{ role.name }}</strong>
              <span class="text-muted small ms-1">({{ role.slug }})</span>
              <div v-if="role.description" class="text-muted small">{{ role.description }}</div>
            </label>
          </div>

          <div v-if="otherRoles.length === 0" class="text-muted small">
            Немає інших ролей для вибору
          </div>
        </template>
      </template>

      <template #footer>
        <div></div>
        <div class="d-flex gap-2">
          <button @click="closeModal" class="btn btn-secondary btn-sm">
            Скасувати
          </button>
          <button @click="saveRole" class="btn btn-primary btn-sm" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            Зберегти
          </button>
        </div>
      </template>
    </BaseModal>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { usePageLayout } from '@/composables/usePageLayout';
import BaseLayout from '@/layouts/BaseLayout.vue';
import BaseModal from '@/components/BaseModal.vue';

const auth = useAuth();
const { contentMargin: pageMargin } = usePageLayout();

const roles = ref([]);
const permissions = ref([]);
const loading = ref(true);
const error = ref(null);

const modalVisible = ref(false);
const selectedRole = ref(null);
const modalMode = ref('create'); // 'create' | 'edit'
const activeTab = ref('general');
const formData = ref({});
const selectedPermissions = ref([]); // Array of {id, effect}
const selectedParents = ref([]);
const saving = ref(false);
const saveError = ref(null);
const permissionsLoading = ref(false);

const groupedPermissions = computed(() => {
  const groups = {};
  permissions.value.forEach(perm => {
    const module = perm.module || 'other';
    if (!groups[module]) {
      groups[module] = { name: module, permissions: [] };
    }
    groups[module].permissions.push(perm);
  });
  return Object.values(groups);
});

const otherRoles = computed(() => {
  if (!selectedRole.value) return [];
  return roles.value.filter(r => r.id !== selectedRole.value.id);
});

// Закриття через хрестик/бекдроп/Escape всередині BaseModal минає closeModal()
// нижче — тому прибирання обраної ролі винесено сюди, в один watcher на будь-яке
// закриття. Зсув контенту сторінки (modal-content-margin-change) тепер теж
// відправляє сам BaseModal — окремий watch тут більше не потрібен.
watch(modalVisible, (val, wasVisible) => {
  if (wasVisible && !val) {
    selectedRole.value = null;
  }
});

onMounted(async () => {
  await loadRoles();
});

async function loadRoles() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/admin/roles', {
      headers: auth.authHeaders(),
    });
    const json = await response.json();

    if (json.status === 'success') {
      roles.value = json.roles;
    } else {
      error.value = json.message || 'Помилка завантаження ролей';
    }
  } catch (e) {
    error.value = "Помилка з'єднання з сервером";
  } finally {
    loading.value = false;
  }
}

async function loadPermissions() {
  if (permissions.value.length > 0) return; // Already loaded

  permissionsLoading.value = true;
  try {
    const response = await fetch('/api/admin/permissions', {
      headers: auth.authHeaders(),
    });
    const json = await response.json();

    if (json.status === 'success') {
      permissions.value = json.permissions;
    }
  } catch (e) {
    console.error('Failed to load permissions:', e);
  } finally {
    permissionsLoading.value = false;
  }
}

function isPermissionSelected(permId) {
  return selectedPermissions.value.some(p => p.id === permId);
}

function getPermissionEffect(permId) {
  const perm = selectedPermissions.value.find(p => p.id === permId);
  return perm?.effect || 'allow';
}

function togglePermission(permId, checked) {
  if (checked) {
    if (!isPermissionSelected(permId)) {
      selectedPermissions.value.push({ id: permId, effect: 'allow' });
    }
  } else {
    selectedPermissions.value = selectedPermissions.value.filter(p => p.id !== permId);
  }
}

function setPermissionEffect(permId, effect) {
  const perm = selectedPermissions.value.find(p => p.id === permId);
  if (perm) {
    perm.effect = effect;
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  selectedRole.value = {};
  formData.value = {
    slug: '',
    name: '',
    description: '',
  };
  selectedPermissions.value = [];
  selectedParents.value = [];
  activeTab.value = 'general';
  saveError.value = null;
  modalVisible.value = true;
}

function openEditModal(role) {
  modalMode.value = 'edit';
  selectedRole.value = role;
  formData.value = {
    slug: role.slug,
    name: role.name,
    description: role.description,
  };
  selectedPermissions.value = role.permissions.map(p => ({
    id: p.id,
    effect: p.effect || 'allow'
  }));
  selectedParents.value = role.parent_roles.map(p => p.id);
  activeTab.value = 'general';
  saveError.value = null;
  modalVisible.value = true;
  loadPermissions();
}

function closeModal() {
  modalVisible.value = false;
}

async function saveRole() {
  saving.value = true;
  saveError.value = null;

  try {
    // Step 1: Save general info
    let roleId = selectedRole.value.id;

    if (modalMode.value === 'create') {
      const createRes = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.authHeaders(),
        },
        body: JSON.stringify(formData.value),
      });
      const createJson = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createJson.message || 'Помилка створення ролі');
      }

      roleId = createJson.role.id;
    } else {
      const updateRes = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...auth.authHeaders(),
        },
        body: JSON.stringify(formData.value),
      });
      const updateJson = await updateRes.json();

      if (!updateRes.ok) {
        throw new Error(updateJson.message || 'Помилка оновлення ролі');
      }
    }

    // Step 2: Save permissions
    const permsRes = await fetch(`/api/admin/roles/${roleId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeaders(),
      },
      body: JSON.stringify({ permissions: selectedPermissions.value }),
    });

    if (!permsRes.ok) {
      const permsJson = await permsRes.json();
      throw new Error(permsJson.message || 'Помилка збереження прав');
    }

    // Step 3: Save hierarchy
    const hierRes = await fetch(`/api/admin/roles/${roleId}/hierarchy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeaders(),
      },
      body: JSON.stringify({ parent_role_ids: selectedParents.value }),
    });

    if (!hierRes.ok) {
      const hierJson = await hierRes.json();
      throw new Error(hierJson.message || 'Помилка збереження ієрархії');
    }

    // Reload and close
    await loadRoles();
    closeModal();
  } catch (e) {
    saveError.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function deleteRole(role) {
  if (!confirm(`Видалити роль "${role.name}"?`)) return;

  try {
    const response = await fetch(`/api/admin/roles/${role.id}`, {
      method: 'DELETE',
      headers: auth.authHeaders(),
    });
    const json = await response.json();

    if (json.status === 'success') {
      await loadRoles();
    } else {
      alert(json.message || 'Помилка видалення');
    }
  } catch (e) {
    alert("Помилка з'єднання");
  }
}
</script>

<style scoped>
.page-content-wrapper {
  transition: margin 0.3s ease;
}
</style>

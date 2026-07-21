<template>
  <BaseLayout>
    <div class="container-fluid py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">Права доступу (Permissions)</h4>
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
                <th style="width: 200px">Slug</th>
                <th style="width: 250px">Назва</th>
                <th style="width: 120px">Модуль</th>
                <th>Опис</th>
                <th style="width: 80px" class="text-center">Системний</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="perm in permissions" :key="perm.id">
                <td class="text-muted">{{ perm.id }}</td>
                <td><code class="small">{{ perm.slug }}</code></td>
                <td>{{ perm.name }}</td>
                <td>
                  <span v-if="perm.module" class="badge bg-secondary">{{ perm.module }}</span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td>
                  <div v-if="editingId === perm.id" class="d-flex gap-2">
                    <textarea
                      v-model="editingDescription"
                      class="form-control form-control-sm"
                      rows="3"
                      @keyup.esc="cancelEdit"
                      ref="descriptionInput"
                    ></textarea>
                    <div class="d-flex flex-column gap-1">
                      <button
                        @click="saveDescription(perm)"
                        class="btn btn-sm btn-success"
                        :disabled="saving"
                        title="Зберегти"
                      >
                        <i class="bi bi-check-lg"></i>
                      </button>
                      <button
                        @click="cancelEdit"
                        class="btn btn-sm btn-secondary"
                        title="Скасувати"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    v-else
                    class="text-muted small"
                    @dblclick="startEdit(perm)"
                    style="cursor: pointer; white-space: pre-wrap;"
                    :title="'Подвійний клік для редагування'"
                  >
                    {{ perm.description || '—' }}
                  </div>
                </td>
                <td class="text-center">
                  <span v-if="perm.is_system" class="text-success" title="Системний запис">
                    <i class="bi bi-shield-lock-fill"></i>
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="!loading && !error" class="mt-3 text-muted small">
        <i class="bi bi-info-circle me-1"></i>
        Всього записів: {{ permissions.length }}. Подвійний клік по опису для редагування.
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useAuth } from '@/composables/useAuth';
import BaseLayout from '@/layouts/BaseLayout.vue';

const auth = useAuth();

const permissions = ref([]);
const loading = ref(true);
const error = ref(null);
const editingId = ref(null);
const editingDescription = ref('');
const saving = ref(false);
const descriptionInput = ref(null);

onMounted(async () => {
  await loadPermissions();
});

async function loadPermissions() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/admin/permissions', {
      headers: auth.authHeaders(),
    });
    const json = await response.json();

    if (json.status === 'success') {
      permissions.value = json.permissions;
    } else {
      error.value = json.message || 'Помилка завантаження прав доступу';
    }
  } catch (e) {
    error.value = "Помилка з'єднання з сервером";
  } finally {
    loading.value = false;
  }
}

async function startEdit(perm) {
  editingId.value = perm.id;
  editingDescription.value = perm.description || '';
  await nextTick();
  if (descriptionInput.value) {
    descriptionInput.value.focus();
  }
}

function cancelEdit() {
  editingId.value = null;
  editingDescription.value = '';
}

async function saveDescription(perm) {
  saving.value = true;

  try {
    const response = await fetch(`/api/admin/permissions/${perm.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeaders(),
      },
      body: JSON.stringify({ description: editingDescription.value }),
    });
    const json = await response.json();

    if (json.status === 'success') {
      perm.description = editingDescription.value;
      cancelEdit();
    } else {
      alert(json.message || 'Помилка збереження');
    }
  } catch (e) {
    alert("Помилка з'єднання з сервером");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>

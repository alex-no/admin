<template>
  <BaseLayout>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <h5 class="mb-0">Менеджери СТО та їх права</h5>
      <div class="d-flex gap-2 flex-wrap">
        <input
          v-model="search"
          type="text"
          class="form-control form-control-sm"
          style="width:250px"
          placeholder="Пошук за СТО або менеджером..."
          @input="debounceLoad"
        />
        <select v-model="filterStoId" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">Всі СТО</option>
          <option v-for="sto in stos" :key="sto.id" :value="sto.id">{{ sto.name_uk }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:60px">STO ID</th>
                <th>Назва СТО</th>
                <th>Менеджер</th>
                <th>Email</th>
                <th style="width:350px">Права доступу</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="manager in items" :key="`${manager.sto_id}-${manager.user_id}`">
                <td class="text-end">{{ manager.sto_id }}</td>
                <td>
                  <strong>{{ manager.sto?.name_uk || '—' }}</strong>
                </td>
                <td>
                  {{ manager.user?.full_name || '—' }}
                </td>
                <td class="text-muted small">
                  {{ manager.user?.email || '—' }}
                </td>
                <td>
                  <div class="d-flex flex-nowrap gap-1">
                    <span
                      v-for="perm in availablePermissions"
                      :key="perm.key"
                      :class="[
                        'badge',
                        manager.permissions.includes(perm.key) ? 'bg-success' : 'bg-secondary',
                        savingMap[`${manager.sto_id}-${manager.user_id}`] ? 'opacity-50' : 'cursor-pointer'
                      ]"
                      style="font-size:0.7rem; white-space: nowrap;"
                      :title="perm.description"
                      @click="!savingMap[`${manager.sto_id}-${manager.user_id}`] && togglePermission(manager, perm.key)"
                    >
                      {{ perm.label }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="items.length === 0">
                <td colspan="5" class="text-center text-muted py-4">
                  Менеджерів не знайдено
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > perPage" class="d-flex justify-content-between align-items-center mt-3">
        <div class="text-muted small">
          Показано {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} з {{ total }}
        </div>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: page === 1 }">
              <a class="page-link" href="#" @click.prevent="load(page - 1)">Попередня</a>
            </li>
            <li
              v-for="p in paginationPages"
              :key="p"
              class="page-item"
              :class="{ active: p === page }"
            >
              <a class="page-link" href="#" @click.prevent="load(p)">{{ p }}</a>
            </li>
            <li class="page-item" :class="{ disabled: page >= Math.ceil(total / perPage) }">
              <a class="page-link" href="#" @click.prevent="load(page + 1)">Наступна</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseLayout from '../layouts/BaseLayout.vue'

const auth = useAuth()
const authHeaders = () => auth.authHeaders()

const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(50)
const loading = ref(false)
const error = ref('')
const search = ref('')
const filterStoId = ref('')
const stos = ref([])

const availablePermissions = ref([])
const savingMap = ref({})

let debounceTimeout = null

const paginationPages = computed(() => {
  const totalPages = Math.ceil(total.value / perPage.value)
  const pages = []
  const current = page.value
  const delta = 2

  for (let i = Math.max(1, current - delta); i <= Math.min(totalPages, current + delta); i++) {
    pages.push(i)
  }

  return pages
})

async function load(p = 1) {
  if (p < 1) return
  page.value = p
  loading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams({
      page: page.value,
      per_page: perPage.value,
    })

    if (search.value) params.append('search', search.value)
    if (filterStoId.value) params.append('sto_id', filterStoId.value)

    const res = await fetch(`/api/admin/sto-managers?${params}`, { headers: authHeaders() })
    const data = await res.json()

    if (!res.ok) throw new Error(data.error || 'Failed to load')

    items.value = data.items
    total.value = data.total
    page.value = data.page
    perPage.value = data.per_page
  } catch (err) {
    error.value = err.message || 'Помилка завантаження даних'
  } finally {
    loading.value = false
  }
}

function debounceLoad() {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => load(1), 300)
}

async function loadStos() {
  try {
    const res = await fetch('/api/admin/sto-managers/stos', { headers: authHeaders() })
    stos.value = await res.json()
  } catch (err) {
    console.error('Failed to load STOs:', err)
  }
}

async function loadPermissions() {
  try {
    const res = await fetch('/api/admin/sto-managers/permissions', { headers: authHeaders() })
    const data = await res.json()
    availablePermissions.value = data.permissions
  } catch (err) {
    console.error('Failed to load permissions:', err)
  }
}

async function togglePermission(manager, permKey) {
  const key = `${manager.sto_id}-${manager.user_id}`
  savingMap.value[key] = true

  // Store original permissions for rollback
  const originalPerms = [...manager.permissions]

  try {
    // Toggle permission in local array immediately
    const currentPerms = [...manager.permissions]
    const index = currentPerms.indexOf(permKey)

    if (index > -1) {
      currentPerms.splice(index, 1)
    } else {
      currentPerms.push(permKey)
    }

    // Update UI optimistically
    manager.permissions = currentPerms

    // Send update to server
    const res = await fetch(`/api/admin/sto-managers/${manager.sto_id}/${manager.user_id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: currentPerms }),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to save')

    // Update with server response
    const itemIndex = items.value.findIndex(
      m => m.sto_id === manager.sto_id && m.user_id === manager.user_id
    )
    if (itemIndex !== -1) {
      items.value[itemIndex] = result.manager
    }
  } catch (err) {
    // Rollback on error
    manager.permissions = originalPerms
    error.value = `Помилка: ${err.message || 'Не вдалося зберегти зміни'}`
    setTimeout(() => error.value = '', 5000)
  } finally {
    delete savingMap.value[key]
  }
}

onMounted(() => {
  load()
  loadStos()
  loadPermissions()
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.badge {
  user-select: none;
}
</style>

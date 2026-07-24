<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="isOpen"
    storage-key="role-management-modal"
    :default-width="500"
    :min-width="400"
    :max-width="700"
    :default-height="400"
    :min-height="300"
    :max-height="700"
  >
    <template #title>
      <h6 class="mb-0">Ролі: {{ userName }}</h6>
    </template>

    <div v-if="error" class="alert alert-danger small mb-3">{{ error }}</div>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
    </div>

    <div v-else>
      <div v-for="role in availableRoles" :key="role.id" class="form-check mb-3">
        <input
          class="form-check-input"
          type="checkbox"
          :id="'role-' + role.id"
          :value="role.id"
          v-model="selectedRoles"
        />
        <label class="form-check-label" :for="'role-' + role.id">
          <strong>{{ role.name }}</strong>
          <div class="small text-muted">{{ role.description }}</div>
        </label>
      </div>
    </div>

    <template #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button @click="close" class="btn btn-secondary btn-sm">
          Скасувати
        </button>
        <button @click="save" class="btn btn-primary btn-sm" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          Зберегти
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseModal from './BaseModal.vue'

const auth = useAuth()

// Component state
const isOpen = ref(false)
const userId = ref(null)
const userName = ref('')
const availableRoles = ref([])
const selectedRoles = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref(null)

// Закриття через хрестик/бекдроп/Escape всередині BaseModal минає close() нижче —
// тому прибирання стану винесено сюди, в один watcher на будь-яке закриття.
watch(isOpen, (val, wasOpen) => {
  if (wasOpen && !val) {
    userId.value = null
    userName.value = ''
    selectedRoles.value = []
    error.value = null
  }
})

async function loadRoles() {
  loading.value = true
  try {
    const response = await fetch('/api/admin/management/roles', {
      headers: auth.authHeaders(),
    })
    const json = await response.json()

    if (json.status === 'success') {
      availableRoles.value = json.roles
    } else {
      error.value = json.message || 'Помилка завантаження ролей'
    }
  } catch (e) {
    error.value = 'Помилка з\'єднання з сервером'
  } finally {
    loading.value = false
  }
}

function open(user) {
  userId.value = user.id
  userName.value = user.username
  selectedRoles.value = user.roles.map(r => r.id)
  error.value = null
  isOpen.value = true

  // Загружаем роли при открытии
  loadRoles()
}

async function save() {
  saving.value = true
  error.value = null

  try {
    const response = await fetch(`/api/admin/management/users/${userId.value}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeaders(),
      },
      body: JSON.stringify({ role_ids: selectedRoles.value }),
    })
    const json = await response.json()

    if (json.status === 'success') {
      // Отправляем событие об успешном сохранении
      window.dispatchEvent(new CustomEvent('roles-updated'))
      close()
    } else {
      error.value = json.message || 'Помилка збереження ролей'
    }
  } catch (e) {
    error.value = 'Помилка з\'єднання'
  } finally {
    saving.value = false
  }
}

function close() {
  isOpen.value = false
}

onMounted(() => {
  // Listen for event from parent
  window.addEventListener('open-role-management', (e) => {
    if (e.detail?.user) {
      open(e.detail.user)
    }
  })
})

defineExpose({ open })
</script>

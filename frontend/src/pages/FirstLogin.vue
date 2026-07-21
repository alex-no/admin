<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
    <div class="card shadow" style="width: 420px; max-width: 90vw;">
      <div class="card-body p-4">
        <h5 class="card-title text-center mb-4">
          <span class="fw-bold">AllSTO</span>
          <span class="text-muted ms-1">Admin</span>
        </h5>

        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>
        <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>

        <form v-if="!redirecting" @submit.prevent="doSetup">
          <div class="alert alert-info py-2 small mb-3">
            <strong>Перший вхід:</strong> Встановіть пароль для доступу до адмін-панелі
          </div>

          <div class="mb-3">
            <label class="form-label small">Ваш логін (username)</label>
            <input
              v-model="username"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': errors.username }"
              autocomplete="username"
              :disabled="loading"
              required
            />
            <div v-if="errors.username" class="invalid-feedback">
              {{ errors.username[0] }}
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small">Новий пароль</label>
            <input
              v-model="password"
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.password }"
              autocomplete="new-password"
              :disabled="loading"
              required
            />
            <div v-if="errors.password" class="invalid-feedback">
              {{ errors.password[0] }}
            </div>
            <div class="form-text small">
              Мінімум 8 символів, великі/малі літери, цифра, спецсимвол (@$!%*?&#_-)
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label small">Підтвердження пароля</label>
            <input
              v-model="passwordConfirm"
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.password_confirm }"
              autocomplete="new-password"
              :disabled="loading"
              required
            />
            <div v-if="errors.password_confirm" class="invalid-feedback">
              {{ errors.password_confirm[0] }}
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            Встановити пароль
          </button>

          <div class="text-center mt-3">
            <router-link to="/login" class="small text-muted">
              Вже є пароль? Увійти
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const error = ref(null)
const successMessage = ref('')
const errors = ref({})
const redirecting = ref(false)

async function doSetup() {
  loading.value = true
  error.value = null
  successMessage.value = ''
  errors.value = {}

  try {
    const response = await fetch('/api/admin/credential/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        password_confirm: passwordConfirm.value
      })
    })

    const json = await response.json()

    if (json.status === 'success') {
      successMessage.value = 'Пароль встановлено! Перенаправлення на сторінку входу...'
      redirecting.value = true

      setTimeout(() => {
        router.push({
          path: '/login',
          query: { message: 'Пароль встановлено. Увійдіть з новим паролем.' }
        })
      }, 2000)
    } else if (json.errors) {
      errors.value = json.errors
    } else {
      // Если пароль уже установлен или доступ не выдан
      error.value = json.message || 'Помилка встановлення пароля'

      if (json.message?.includes('already set') || json.message?.includes('вже встановлено')) {
        redirecting.value = true
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }
  } catch (e) {
    error.value = 'Помилка з\'єднання з сервером'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>

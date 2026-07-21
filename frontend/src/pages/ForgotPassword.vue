<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
    <div class="card shadow" style="width: 360px;">
      <div class="card-body p-4">
        <h5 class="card-title text-center mb-4">
          <span class="fw-bold">AllSTO</span>
          <span class="text-muted ms-1">Admin</span>
          <span class="badge bg-danger ms-2">Admin</span>
        </h5>

        <h6 class="mb-3 text-center">Відновлення паролю адміністратора</h6>

        <div v-if="sent" class="alert alert-success py-2 small">
          Посилання для скидання паролю відправлено на вашу пошту.
        </div>

        <form v-else @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label class="form-label small">Email</label>
            <input
              v-model="login"
              type="email"
              class="form-control"
              :class="{ 'is-invalid': fieldError }"
              :disabled="loading"
              required
            />
            <div v-if="fieldError" class="invalid-feedback">{{ fieldError }}</div>
          </div>

          <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            Відправити посилання
          </button>

          <div class="text-center">
            <router-link to="/login" class="text-decoration-none small">
              Повернутися до входу
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const login      = ref('')
const fieldError = ref('')
const loading    = ref(false)
const sent       = ref(false)

onMounted(() => {
  document.title = 'Відновлення паролю адміністратора - AllSTO Admin'
})

async function handleSubmit() {
  fieldError.value = ''
  const trimmed = login.value.trim()

  if (!trimmed) {
    fieldError.value = 'Поле обов\'язкове'
    return
  }

  // Admin: only email allowed (strict validation)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(trimmed)) {
    fieldError.value = 'Введіть коректний email'
    return
  }

  loading.value = true
  try {
    await fetch('/api/admin/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: trimmed })
    })
  } catch {
    // intentionally swallow — always show success to prevent user enumeration
  } finally {
    loading.value = false
    sent.value = true
  }
}
</script>

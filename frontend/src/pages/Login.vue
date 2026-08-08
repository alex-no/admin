<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
    <div class="card shadow" style="width: 360px;">
      <div class="card-body p-4">
        <h5 class="card-title text-center mb-4">
          <span class="fw-bold">Oleksandr Nosov</span>
          <span class="text-muted ms-1">Admin</span>
        </h5>

        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>
        <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>

        <!-- Password setup redirect message -->
        <div v-if="needsPasswordSetup" class="alert alert-info">
          <p class="mb-2"><strong>{{ t('auth.firstLoginTitle') }}</strong></p>
          <p class="small mb-3">{{ t('auth.passwordSetupRequired') }}</p>
          <router-link to="/first-login" class="btn btn-primary btn-sm w-100">
            {{ t('auth.setPassword') }}
          </router-link>
        </div>

        <!-- Normal login form -->
        <form v-else @submit.prevent="doLogin">
          <div class="mb-3">
            <label class="form-label small">{{ t('auth.username') }}</label>
            <input
              v-model="username"
              type="text"
              class="form-control"
              autocomplete="username"
              :disabled="loading"
              required
            />
          </div>
          <div class="mb-4">
            <label class="form-label small">{{ t('auth.password') }}</label>
            <input
              v-model="password"
              type="password"
              class="form-control"
              autocomplete="current-password"
              :disabled="loading"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ t('auth.signIn') }}
          </button>

          <div class="text-center">
            <router-link to="/forgot-password" class="text-decoration-none small">
              {{ t('auth.forgotPassword') }}
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'

const { t } = useI18n({ useScope: 'global' })
const router   = useRouter()
const route    = useRoute()
const auth     = useAuth()
const username = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref(null)
const successMessage = ref('')

const needsPasswordSetup = ref(false)

onMounted(() => {
  if (route.query.message) {
    successMessage.value = route.query.message
  }
})

async function doLogin() {
  loading.value = true
  error.value   = null
  successMessage.value = ''

  try {
    const result = await auth.login(username.value, password.value)

    if (result?.needsPasswordSetup) {
      needsPasswordSetup.value = true
      loading.value = false
      return
    }

    await router.push('/dashboard')
  } catch (e) {
    error.value = e.message || t('auth.networkError')
    loading.value = false
  }
}

</script>

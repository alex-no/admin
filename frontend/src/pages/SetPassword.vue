<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
    <div class="card shadow" style="width: 480px; max-width: 90vw;">
      <div class="card-header px-4 py-3">
        <h5 class="mb-0">Встановити пароль адміністратора</h5>
      </div>

      <form @submit.prevent="submitPassword">
        <div class="card-body px-4 py-3">
          <div class="alert alert-info mb-3">
            <strong>Перший вхід:</strong> Встановіть окремий пароль для доступу до адмін-панелі.
          </div>

          <div class="mb-3">
            <label class="form-label">Новий пароль *</label>
            <input
              v-model="form.password"
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
              Вимоги: мінімум 8 символів, великі та малі літери, цифра, спецсимвол (@$!%*?&#_-)
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Підтвердження пароля *</label>
            <input
              v-model="form.password_confirm"
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

          <!-- Password strength indicator -->
          <div v-if="passwordStrength > 0" class="mb-3">
            <div class="progress" style="height: 6px;">
              <div
                class="progress-bar"
                :class="strengthColor"
                :style="{ width: passwordStrength + '%' }"
              ></div>
            </div>
            <small class="text-muted">
              Складність: {{ strengthLabel }}
            </small>
          </div>

          <div v-if="errorMessage" class="alert alert-danger small">
            {{ errorMessage }}
          </div>
        </div>

        <div class="card-footer px-4 py-3 text-end">
          <button type="submit" class="btn btn-primary btn-sm" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
            Встановити пароль
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const form = ref({
  password: '',
  password_confirm: ''
});

const errors = ref({});
const errorMessage = ref('');
const loading = ref(false);

const passwordStrength = computed(() => {
  const pwd = form.value.password;
  if (!pwd) return 0;

  let strength = 0;
  if (pwd.length >= 8) strength += 25;
  if (/[a-z]/.test(pwd)) strength += 25;
  if (/[A-Z]/.test(pwd)) strength += 25;
  if (/\d/.test(pwd)) strength += 15;
  if (/[@$!%*?&#_\-]/.test(pwd)) strength += 10;

  return Math.min(strength, 100);
});

const strengthColor = computed(() => {
  if (passwordStrength.value < 40) return 'bg-danger';
  if (passwordStrength.value < 70) return 'bg-warning';
  return 'bg-success';
});

const strengthLabel = computed(() => {
  if (passwordStrength.value < 40) return 'Слабкий';
  if (passwordStrength.value < 70) return 'Середній';
  return 'Надійний';
});

async function submitPassword() {
  errors.value = {};
  errorMessage.value = '';
  loading.value = true;

  try {
    const response = await fetch('/api/admin/credential/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });

    const json = await response.json();

    if (json.status === 'success') {
      // Redirect to login to re-authenticate with new password
      await router.push({
        path: '/login',
        query: { message: 'Пароль встановлено. Увійдіть знову.' }
      });
    } else {
      if (json.errors) {
        errors.value = json.errors;
      } else {
        errorMessage.value = json.message || 'Помилка встановлення пароля';
      }
    }
  } catch (error) {
    errorMessage.value = 'Помилка з\'єднання з сервером';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header,
.card-footer {
  background: white;
  border-bottom: 1px solid #dee2e6;
}

.card-footer {
  border-top: 1px solid #dee2e6;
  border-bottom: none;
}
</style>

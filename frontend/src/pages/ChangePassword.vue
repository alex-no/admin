<template>
  <BaseLayout>
    <div class="container-fluid py-4">
      <div class="row justify-content-center">
        <div class="col-lg-6 col-xl-5">
          <div class="card shadow-sm">
            <div class="card-header px-4 py-3 d-flex justify-content-between align-items-center">
              <h5 class="mb-0">{{ t('authPages.changePasswordTitle') }}</h5>
              <span class="badge bg-danger">Admin</span>
            </div>

            <form @submit.prevent="submitChange">
              <div class="card-body px-4 py-3">
                <div class="mb-3">
                  <label class="form-label">{{ t('authPages.currentPasswordLabel') }}</label>
                  <input
                    v-model="form.current_password"
                    type="password"
                    class="form-control"
                    :class="{ 'is-invalid': errors.current_password }"
                    autocomplete="current-password"
                    :disabled="loading"
                    required
                  />
                  <div v-if="errors.current_password" class="invalid-feedback">
                    {{ errors.current_password[0] }}
                  </div>
                </div>

                <hr class="my-3" />

                <div class="mb-3">
                  <label class="form-label">{{ t('authPages.newPasswordLabel') }}</label>
                  <input
                    v-model="form.new_password"
                    type="password"
                    class="form-control"
                    :class="{ 'is-invalid': errors.new_password }"
                    autocomplete="new-password"
                    :disabled="loading"
                    required
                  />
                  <div v-if="errors.new_password" class="invalid-feedback">
                    {{ errors.new_password[0] }}
                  </div>
                  <div class="form-text small">
                    {{ t('authPages.passwordRequirementsHint') }}
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">{{ t('authPages.confirmNewPasswordLabel') }}</label>
                  <input
                    v-model="form.new_password_confirm"
                    type="password"
                    class="form-control"
                    :class="{ 'is-invalid': errors.new_password_confirm }"
                    autocomplete="new-password"
                    :disabled="loading"
                    required
                  />
                  <div v-if="errors.new_password_confirm" class="invalid-feedback">
                    {{ errors.new_password_confirm[0] }}
                  </div>
                </div>

                <div v-if="errorMessage" class="alert alert-danger small">
                  {{ errorMessage }}
                </div>

                <div v-if="successMessage" class="alert alert-success small">
                  {{ successMessage }}
                </div>
              </div>

              <div class="card-footer px-4 py-3 d-flex justify-content-between">
                <button type="button" class="btn btn-secondary btn-sm" @click="$router.back()">
                  {{ t('common.cancel') }}
                </button>
                <button type="submit" class="btn btn-primary btn-sm" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                  {{ t('auth.changePassword') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import BaseLayout from '@/layouts/BaseLayout.vue';

const { t } = useI18n({ useScope: 'global' });
const router = useRouter();
const auth = useAuth();

const form = ref({
  current_password: '',
  new_password: '',
  new_password_confirm: ''
});

const errors = ref({});
const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);

// Set page title
onMounted(() => {
  document.title = t('authPages.changePasswordPageTitle');

  // Check if user is authenticated as admin
  if (!auth.isAuthenticated()) {
    errorMessage.value = t('authPages.notAuthenticatedError');
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  }
});

async function submitChange() {
  errors.value = {};
  errorMessage.value = '';
  successMessage.value = '';
  loading.value = true;

  try {
    const response = await fetch('/api/admin/credential/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeaders()
      },
      body: JSON.stringify(form.value)
    });

    const json = await response.json();

    if (json.status === 'success') {
      successMessage.value = t('authPages.changePasswordSuccess');
      form.value = {
        current_password: '',
        new_password: '',
        new_password_confirm: ''
      };

      // Use setTimeout with longer delay to ensure message is visible
      // and force navigation after success message display
      setTimeout(() => {
        // Force full page reload to avoid white screen
        window.location.href = '/admin/#/dashboard';
      }, 2000);
    } else {
      if (json.errors) {
        errors.value = json.errors;
      } else {
        errorMessage.value = json.message || t('authPages.changePasswordError');
      }
    }
  } catch (error) {
    errorMessage.value = t('roles.connectionError');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.card {
  border: 1px solid var(--bs-border-color);
}

.card-header,
.card-footer {
  background: white;
}

.card-header {
  border-bottom: 1px solid var(--bs-border-color);
}

.card-footer {
  border-top: 1px solid var(--bs-border-color);
}
</style>

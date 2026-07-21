<template>
  <BaseLayout>
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-book me-2"></i>Admin API Documentation
        </h5>
        <span class="badge bg-warning text-dark">Dev Only</span>
      </div>
      <div class="card-body p-0">
        <iframe
          :src="swaggerUrl"
          style="width: 100%; height: calc(100vh - 200px); border: none;"
          title="Admin API Documentation"
        ></iframe>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { computed } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'

const swaggerUrl = computed(() => {
  // Використовуємо поточний origin
  return `${window.location.origin}/api/admin/doc`
})
</script>

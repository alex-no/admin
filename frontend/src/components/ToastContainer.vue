<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1090">
    <div
      v-for="n in notifications"
      :key="n.id"
      class="toast show align-items-center border-0 mb-2"
      :class="toastClass(n.type)"
      role="alert"
    >
      <div class="d-flex">
        <div class="toast-body" style="white-space: pre-wrap">{{ n.message }}</div>
        <button
          v-if="n.action"
          type="button"
          class="btn btn-sm btn-link text-white text-decoration-none flex-shrink-0 align-self-center"
          @click="handleAction(n)"
        >
          {{ n.action.label }}
        </button>
        <button
          type="button"
          class="btn-close btn-close-white flex-shrink-0 align-self-center me-2"
          @click="dismiss(n.id)"
        ></button>
      </div>
      <div v-if="n.duration" class="toast-progress" :style="{ animationDuration: n.duration + 'ms' }"></div>
    </div>
  </div>
</template>

<script setup>
import { useNotify } from '@/composables/useNotify'

const { notifications, dismiss } = useNotify()

function toastClass(type) {
  return (
    {
      success: 'text-bg-success',
      error: 'text-bg-danger',
      info: 'text-bg-secondary',
    }[type] ?? 'text-bg-secondary'
  )
}

// Дію (напр. "Скасувати") виконуємо і одразу закриваємо тост — не чекаємо автозакриття,
// щоб не можна було клікнути дію двічі.
function handleAction(n) {
  n.action.onClick()
  dismiss(n.id)
}
</script>

<style scoped>
.toast-progress {
  height: 3px;
  background: rgba(255, 255, 255, 0.6);
  animation-name: toast-progress-shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes toast-progress-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>

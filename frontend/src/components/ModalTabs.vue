<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div class="modal-tabs-sticky border-bottom px-2">
    <ul class="nav nav-tabs border-0">
      <li v-for="tab in tabs" :key="tab.key" class="nav-item">
        <button
          type="button"
          class="nav-link py-2 px-2 small text-nowrap"
          :class="{ active: modelValue === tab.key }"
          @click="$emit('update:modelValue', tab.key)"
        >
          <i v-if="tab.icon" :class="['bi', tab.icon, 'me-1']"></i>{{ tab.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  // [{ key, label, icon }]
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
/* Sticky-панель вкладок всередині BaseModal (та сама верстка/CSS, що в AllSTO) */
.modal-tabs-sticky {
  position: sticky;
  top: -16px;
  left: 0;
  right: 0;
  z-index: 100;
  background: #ffffff;
  margin: -0.75rem -1rem 0.5rem -1rem;
  padding: 0.25rem 1rem 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.modal-tabs-sticky .nav-link {
  padding: 0.375rem 0.5rem !important;
  font-size: 0.8rem;
}
</style>

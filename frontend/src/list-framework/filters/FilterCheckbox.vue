<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div class="form-check form-check-inline mb-0">
    <input
      :id="`filter-${field.key}`"
      class="form-check-input"
      type="checkbox"
      :checked="!!modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <label class="form-check-label small" :for="`filter-${field.key}`">{{ field.label }}</label>
  </div>
</template>

<script setup>
defineProps({
  field: { type: Object, required: true },
  modelValue: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

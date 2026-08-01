<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <span v-if="readonly" class="d-inline-flex align-items-center gap-1">
    <!-- Іконка лише при значенні: біля прочерку зірочка читалась би як оцінка 0 -->
    <i v-if="field.icon && modelValue != null" class="bi" :class="field.icon" style="font-size:.7rem"></i>
    {{ modelValue ?? field.emptyLabel ?? '—' }}
  </span>
  <span v-else class="d-inline-flex align-items-center gap-1">
    <i v-if="field.icon" class="bi" :class="field.icon" style="font-size:.7rem"></i>
    <input
      :value="modelValue"
      type="number"
      :min="field.min"
      :max="field.max"
      :step="field.step ?? 1"
      class="form-control form-control-sm"
      style="width:90px"
      @change="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))"
    />
  </span>
</template>

<script setup>
defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: null },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])
</script>

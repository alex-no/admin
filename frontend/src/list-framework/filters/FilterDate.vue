<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <input
    :value="modelValue"
    type="date"
    class="form-control form-control-sm"
    style="width:auto"
    :title="field.label ?? ''"
    @change="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
// Одна межа діапазону. Дві межі — це два фільтри з різними key
// (напр. date_from / date_to), бо в запит вони йдуть окремими параметрами.
defineProps({
  field: { type: Object, required: true },
  modelValue: { type: String, default: '' },
  filterValues: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])
</script>

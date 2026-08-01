<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <!-- maxWidth: довгий текст (повідомлення, опис) обрізається, повний — у title -->
  <div
    v-if="readonly && field.maxWidth"
    class="text-truncate"
    :style="{ maxWidth: field.maxWidth }"
    :title="modelValue ?? ''"
  >{{ modelValue ?? field.emptyLabel ?? '—' }}</div>
  <span v-else-if="readonly">{{ modelValue ?? field.emptyLabel ?? '—' }}</span>
  <input
    v-else
    :value="modelValue"
    type="text"
    class="form-control form-control-sm"
    @change="$emit('update:modelValue', $event.target.value)"
  />
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

<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <span v-if="modelValue !== null && modelValue !== undefined && modelValue !== ''" class="badge" :class="`bg-${variant}`">
    {{ label }}
  </span>
  <span v-else class="text-muted">{{ field.emptyLabel ?? '—' }}</span>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Значення як кольоровий бейдж. `options` дають підпис (як у select),
 * `variants` — колір Bootstrap на значення; без збігу — `secondary`.
 * Редагування немає: це подання, а не ввід (для вибору зі списку є `select`).
 */
const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number, Boolean], default: null },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

const label = computed(() => {
  const found = (props.field.options ?? []).find((o) => String(o.value) === String(props.modelValue))
  return found ? found.label : props.modelValue
})

const variant = computed(
  () => props.field.variants?.[props.modelValue] ?? props.field.variant ?? 'secondary'
)
</script>

<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <span class="text-muted" style="white-space:nowrap">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate, formatDateShort } from '@/utils/date'

// Дати ніде не редагуються інлайн — комірка завжди readonly (проп приймається
// заради єдиного інтерфейсу з рештою типів). `dateOnly: true` — без часу.
const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number, Date], default: null },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

const text = computed(() =>
  props.field.dateOnly ? formatDateShort(props.modelValue) : formatDate(props.modelValue)
)
</script>

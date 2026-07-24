<template>
  <span v-if="active" class="d-inline-flex align-items-center ms-1">
    <i class="bi" :class="dir === 'ASC' ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
    <sup v-if="showOrder" class="ms-1">{{ order }}</sup>
  </span>
  <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
</template>

<script setup>
import { computed } from 'vue'

// Два режими: старий (одна колонка — col+sortKey+sortDir, використовується
// на кількох сторінках, ще не переведених на list-framework) і новий, для
// мульти-сортування (col+sortItems — масив [{ key, dir }], порядок клацань
// Ctrl/Cmd+click; showOrder показує пріоритет цифрою, коли колонок декілька).
const props = defineProps({
  col: { type: String, required: true },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'ASC' },
  sortItems: { type: Array, default: null },
})

const index = computed(() =>
  props.sortItems ? props.sortItems.findIndex((s) => s.key === props.col) : (props.sortKey === props.col ? 0 : -1)
)
const active = computed(() => index.value !== -1)
const dir = computed(() => (props.sortItems ? props.sortItems[index.value]?.dir : props.sortDir))
const order = computed(() => index.value + 1)
const showOrder = computed(() => !!props.sortItems && props.sortItems.length > 1)
</script>

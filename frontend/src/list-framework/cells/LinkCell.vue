<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <template v-if="readonly">
    <a
      v-if="href"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="text-truncate d-inline-block align-bottom"
      :style="{ maxWidth: field.maxWidth ?? '180px' }"
      :title="modelValue"
    >{{ modelValue }}</a>
    <!-- Значення є, але схема не з дозволених — показуємо текстом, не посиланням -->
    <span
      v-else-if="text"
      class="text-truncate d-inline-block align-bottom"
      :style="{ maxWidth: field.maxWidth ?? '180px' }"
      :title="text"
    >{{ text }}</span>
    <span v-else class="text-muted">{{ field.emptyLabel ?? '—' }}</span>
  </template>
  <input
    v-else
    :value="modelValue"
    type="text"
    class="form-control form-control-sm"
    placeholder="https://..."
    @change="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: String, default: null },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

// Дані приходять з БД (імпорти, ручний ввід), тому схему перевіряємо: клікабельним
// робимо лише http/https/mailto/tel. Інакше рядок `javascript:...` у полі сайту
// став би робочим посиланням — це XSS через звичайний клік по таблиці.
const SAFE_SCHEME = /^(https?|mailto|tel):/i
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

const text = computed(() => (props.modelValue ?? '').trim())

const href = computed(() => {
  if (!text.value) return null
  if (HAS_SCHEME.test(text.value)) return SAFE_SCHEME.test(text.value) ? text.value : null
  // "example.com" без схеми інакше поїхало б відносно поточного шляху адмінки
  return `https://${text.value}`
})
</script>

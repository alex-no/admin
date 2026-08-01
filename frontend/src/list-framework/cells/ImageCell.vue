<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <img
    v-if="src"
    :src="src"
    :alt="field.label ?? ''"
    :style="boxStyle"
    loading="lazy"
  />
  <span v-else class="text-muted">{{ field.emptyLabel ?? '—' }}</span>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Мініатюра за URL у полі рядка. Редагування немає: завантаження файлу — це
 * форма, а не комірка таблиці (обкладинка новини міняється в її картці).
 */
const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: String, default: null },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

// Адреса приходить з БД/сховища. Пропускаємо лише http(s), протокол-відносні,
// корене-відносні (`/storage/...`) і data:image — щоб у src не поїхало щось
// стороннє з імпортованих даних.
const SAFE_SRC = /^(https?:\/\/|\/\/|\/|data:image\/)/i

const src = computed(() => {
  const v = (props.modelValue ?? '').trim()
  return v && SAFE_SRC.test(v) ? v : null
})

const boxStyle = computed(() => {
  const size = props.field.imageSize ?? '40px'
  return {
    width: size,
    height: size,
    objectFit: 'cover',
    borderRadius: '4px',
  }
})
</script>

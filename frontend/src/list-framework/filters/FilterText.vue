<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <input
    :value="modelValue"
    type="text"
    class="form-control form-control-sm"
    style="width:200px"
    :placeholder="translateLabel(field.placeholder ?? field.label)"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: '' },
})
defineEmits(['update:modelValue'])

function translateLabel(label) {
  if (!label) return ''
  if (label.includes('.')) {
    const translated = t(label)
    return translated !== label ? translated : label
  }
  return label
}
</script>

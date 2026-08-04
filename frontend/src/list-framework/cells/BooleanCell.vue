<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <span v-if="readonly" class="badge" :class="modelValue ? 'bg-success' : 'bg-danger'">
    {{ labelText }}
  </span>
  <button
    v-else
    type="button"
    class="badge border-0 btn p-1"
    :class="modelValue ? 'bg-success' : 'bg-danger'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    {{ labelText }}
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: Boolean, default: false },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
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

const labelText = computed(() => {
  if (props.modelValue) {
    return translateLabel(props.field.trueLabel ?? 'common.yes')
  }
  return translateLabel(props.field.falseLabel ?? 'common.no')
})
</script>

<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <span v-if="readonly">{{ translateLabel(currentLabel) }}</span>
  <select
    v-else
    :value="modelValue"
    class="form-select form-select-sm"
    style="width:auto"
    :disabled="loading"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ translateLabel(opt.label) }}</option>
  </select>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRemoteOptions } from '../composables/useRemoteOptions'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: null },
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

const remote = props.field.optionsUrl
  ? useRemoteOptions(props.field.optionsUrl, {
      valueKey: props.field.optionsValueKey ?? 'id',
      labelKey: props.field.optionsLabelKey ?? 'name_uk',
      labelTemplate: props.field.optionsLabelTemplate ?? null,
    })
  : null

const options = computed(() => remote ? remote.options.value : (props.field.options ?? []))
const loading = computed(() => remote ? remote.loading.value : false)

const currentLabel = computed(() => {
  const found = options.value.find(o => String(o.value) === String(props.modelValue))
  return found ? found.label : (props.modelValue ?? props.field.emptyLabel ?? '—')
})
</script>

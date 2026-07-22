<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <span v-if="readonly">{{ currentLabel }}</span>
  <select
    v-else
    :value="modelValue"
    class="form-select form-select-sm"
    style="width:auto"
    :disabled="loading"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<script setup>
import { computed } from 'vue'
import { useRemoteOptions } from '../composables/useRemoteOptions'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: null },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

const remote = props.field.optionsUrl
  ? useRemoteOptions(props.field.optionsUrl, {
      valueKey: props.field.optionsValueKey ?? 'id',
      labelKey: props.field.optionsLabelKey ?? 'name_uk',
    })
  : null

const options = computed(() => remote ? remote.options.value : (props.field.options ?? []))
const loading = computed(() => remote ? remote.loading.value : false)

const currentLabel = computed(() => {
  const found = options.value.find(o => String(o.value) === String(props.modelValue))
  return found ? found.label : (props.modelValue ?? '—')
})
</script>

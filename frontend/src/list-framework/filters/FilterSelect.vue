<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <select
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
  modelValue: { type: [String, Number], default: '' },
})
defineEmits(['update:modelValue'])

// Або статичний field.options, або довантаження за field.optionsUrl (з кешем по URL)
const remote = props.field.optionsUrl
  ? useRemoteOptions(props.field.optionsUrl, {
      valueKey: props.field.optionsValueKey ?? 'id',
      labelKey: props.field.optionsLabelKey ?? 'name_uk',
      placeholderOption: props.field.placeholderOption ?? { value: '', label: props.field.label ?? 'Всі' },
    })
  : null

const options = computed(() => remote ? remote.options.value : (props.field.options ?? []))
const loading = computed(() => remote ? remote.loading.value : false)
</script>

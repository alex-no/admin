<template>
  <span v-if="readonly">{{ modelValue ?? '—' }}</span>
  <input
    v-else
    :value="modelValue"
    type="text"
    class="form-control form-control-sm"
    @change="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: null },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])
</script>

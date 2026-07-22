<template>
  <span v-if="readonly">{{ modelValue ?? '—' }}</span>
  <input
    v-else
    :value="modelValue"
    type="number"
    :min="field.min"
    :max="field.max"
    :step="field.step ?? 1"
    class="form-control form-control-sm"
    style="width:90px"
    @change="$emit('update:modelValue', Number($event.target.value))"
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

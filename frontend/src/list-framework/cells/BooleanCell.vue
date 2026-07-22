<template>
  <span v-if="readonly" class="badge" :class="modelValue ? 'bg-success' : 'bg-danger'">
    {{ modelValue ? (field.trueLabel ?? 'Так') : (field.falseLabel ?? 'Ні') }}
  </span>
  <button
    v-else
    type="button"
    class="badge border-0 btn p-1"
    :class="modelValue ? 'bg-success' : 'bg-danger'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    {{ modelValue ? (field.trueLabel ?? 'Так') : (field.falseLabel ?? 'Ні') }}
  </button>
</template>

<script setup>
defineProps({
  field: { type: Object, required: true },
  modelValue: { type: Boolean, default: false },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])
</script>

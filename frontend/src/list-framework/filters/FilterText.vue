<template>
  <input
    :value="modelValue"
    type="text"
    class="form-control form-control-sm"
    style="width:200px"
    :placeholder="field.placeholder ?? field.label"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: '' },
})
defineEmits(['update:modelValue'])
</script>

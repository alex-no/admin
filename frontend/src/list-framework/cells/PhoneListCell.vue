<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <!-- Перегляд: перший номер у красивому форматі + бейдж "+N", якщо їх декілька -->
  <div v-if="readonly">
    <span v-if="!phones.length" class="text-muted">—</span>
    <template v-else>
      {{ formatPhoneUA(phones[0]) }}
      <span
        v-if="phones.length > 1"
        class="badge bg-secondary ms-1"
        :title="phones.slice(1).map(formatPhoneUA).join(', ')"
      >+{{ phones.length - 1 }}</span>
    </template>
  </div>

  <!-- Редагування: поле починається з того ж красивого формату, що і в перегляді, і
       далі не чіпається — юзер вільно редагує текст як завгодно (жодного форматування
       "на льоту" чи по blur). Прибирання зайвих символів і зведення до E.164 — лише
       перед збереженням (StoRegistry.vue: saveTab). -->
  <div v-else>
    <div v-for="(text, i) in texts" :key="i" class="d-flex align-items-center gap-1 mb-2">
      <input
        :value="text"
        type="text"
        class="form-control form-control-sm"
        placeholder="+38 (0__) ___-__-__"
        @input="onInput(i, $event.target.value)"
      />
      <button type="button" class="btn btn-sm btn-outline-danger" title="Видалити номер" @click="removePhone(i)">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <button type="button" class="btn btn-sm btn-outline-secondary" @click="addPhone">
      <i class="bi bi-plus-lg me-1"></i>Додати номер
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatPhoneUA } from '@/utils/phone'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: true },
  row: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const phones = computed(() => props.modelValue ?? [])

// Локальний текст полів редагування. Ініціалізується (і переініціалізується при
// відкритті іншого рядка) з modelValue, відформатованого для перегляду — але власні
// emit'и цього ж компонента не повинні тригерити переформатування посеред набору тексту.
const texts = ref([])
let selfUpdate = false

watch(
  () => props.modelValue,
  (val) => {
    if (selfUpdate) {
      selfUpdate = false
      return
    }
    texts.value = (val ?? []).map((v) => (v ? formatPhoneUA(v) : ''))
  },
  { immediate: true }
)

function emitUpdate() {
  selfUpdate = true
  emit('update:modelValue', [...texts.value])
}

function onInput(i, value) {
  texts.value[i] = value
  emitUpdate()
}

function addPhone() {
  texts.value.push('')
  emitUpdate()
}

function removePhone(i) {
  texts.value.splice(i, 1)
  emitUpdate()
}
</script>

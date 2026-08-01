<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <select
    :value="modelValue"
    class="form-select form-select-sm"
    style="width:auto"
    :disabled="disabled"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option v-for="opt in ungroupedOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    <!-- Варіанти з `group` збираються в <optgroup> у порядку першої появи -->
    <optgroup v-for="g in groupedOptions" :key="g.label" :label="g.label">
      <option v-for="opt in g.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </optgroup>
  </select>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRemoteOptions } from '../composables/useRemoteOptions'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: '' },
  // Значення решти фільтрів — для залежних (`dependsOn`) списків
  filterValues: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

// Залежний фільтр: `dependsOn: ["country_id"]` + `{country_id}` в optionsUrl.
// Поки батько порожній — список не запитуємо і селект вимкнений: варіантів для
// «усіх країн» тут не буває, а тягнути весь довідник немає сенсу.
const dependsOn = computed(() => props.field.dependsOn ?? [])
const parentsFilled = computed(() =>
  dependsOn.value.every((k) => {
    const v = props.filterValues[k]
    return v !== '' && v !== null && v !== undefined
  })
)

const resolvedUrl = computed(() => {
  if (!props.field.optionsUrl) return null
  if (!parentsFilled.value) return null
  return props.field.optionsUrl.replace(
    /\{(\w+)\}/g,
    (_, key) => encodeURIComponent(props.filterValues[key] ?? '')
  )
})

// `required: true` — фільтр, у якого не буває стану "всі": довідник існує лише в
// межах обраного значення (напр. типи населених пунктів у межах країни). Тоді
// порожньої опції немає, а перший варіант підставляється сам.
const isRequired = computed(() => props.field.required === true)

// `defaultFirstOption: true` — порожній варіант лишається, але при відкритті
// сторінки обирається перший зі списку (напр. регіони: показувати одразу всі
// країни немає сенсу, але повернутись до «Всі країни» користувач може).
const autoFirst = computed(() => isRequired.value || props.field.defaultFirstOption === true)

// Порожня опція ("Всі …") — завжди від рендерера, а не з конфіга: у самому
// field.options її бути не має, інакше React-версія покаже її двічі
// (див. shared/page-configs/README.md, контракт фільтрів).
const placeholderOption = computed(
  () => props.field.placeholderOption ?? { value: '', label: props.field.label ?? 'Всі' }
)

// Або статичний field.options, або довантаження за field.optionsUrl (з кешем по URL).
// Порожню опцію тут навмисно **не** просимо: тримаємо справжні варіанти окремо,
// інакше "перший варіант" для autoFirst виявився б самою опцією «Всі».
// Через computed, а не один виклик на setup: у залежного фільтра URL міняється
// разом зі значенням батька. useRemoteOptions кешує по URL, тому повторний
// виклик для того самого URL — це той самий ref, без нового запиту.
const remote = computed(() =>
  resolvedUrl.value
    ? useRemoteOptions(resolvedUrl.value, {
        valueKey: props.field.optionsValueKey ?? 'id',
        labelKey: props.field.optionsLabelKey ?? 'name_uk',
        labelTemplate: props.field.optionsLabelTemplate ?? null,
      })
    : null
)

const realOptions = computed(() =>
  remote.value ? remote.value.options.value : (props.field.optionsUrl ? [] : (props.field.options ?? []))
)

// Порожня опція додається рендерером — і лише якщо фільтр не обовʼязковий
const options = computed(() =>
  isRequired.value ? realOptions.value : [placeholderOption.value, ...realOptions.value]
)

// Довгий список зручніше читати розділами (напр. типи клієнтів в аналітиці:
// люди / пошуковики / SEO / моніторинг / погані боти). Розділ задається полем
// `group` у варіанті; без нього все лишається як було — плоским списком.
const ungroupedOptions = computed(() => options.value.filter((o) => !o.group))
const groupedOptions = computed(() => {
  const groups = []
  const byLabel = new Map()
  for (const opt of options.value) {
    if (!opt.group) continue
    if (!byLabel.has(opt.group)) {
      const entry = { label: opt.group, options: [] }
      byLabel.set(opt.group, entry)
      groups.push(entry)
    }
    byLabel.get(opt.group).options.push(opt)
  }
  return groups
})
const loading = computed(() => (remote.value ? remote.value.loading.value : false))

// Батько не обраний — вибирати нема з чого; або довідник ще вантажиться
const disabled = computed(() => loading.value || !parentsFilled.value)

// Підстановка першого варіанта. Для `required` — щоразу, коли значення порожнє
// (порожнього стану в такого фільтра не буває взагалі). Для `defaultFirstOption`
// — лише один раз при відкритті: далі порожнє значення означає свідоме «Всі».
let firstOptionApplied = false
watch(
  [realOptions, () => props.modelValue],
  ([opts, value]) => {
    if (!autoFirst.value) return
    if (value !== '' && value !== null && value !== undefined) {
      firstOptionApplied = true
      return
    }
    if (!isRequired.value && firstOptionApplied) return
    if (!opts.length) return
    firstOptionApplied = true
    emit('update:modelValue', opts[0].value)
  },
  { immediate: true }
)
</script>

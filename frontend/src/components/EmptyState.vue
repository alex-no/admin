<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div class="text-center py-5">
    <i :class="['bi', filtered ? 'bi-funnel' : icon]" style="font-size:2.5rem; opacity:.35"></i>

    <p class="text-muted mt-3 mb-3">
      <template v-if="filtered">За вибраними фільтрами нічого не знайдено</template>
      <template v-else>Ще немає {{ entityLabel }}</template>
    </p>

    <button v-if="filtered" class="btn btn-sm btn-outline-secondary" @click="$emit('reset-filters')">
      <i class="bi bi-x-circle me-1"></i>Скинути фільтри
    </button>
    <button v-else-if="canCreate" class="btn btn-sm btn-primary" @click="$emit('create')">
      <i class="bi bi-plus-lg me-1"></i>Створити
    </button>
  </div>
</template>

<script setup>
/**
 * Порожній список. Два стани, які раніше зливались в одне «Немає даних»:
 * записів справді немає (тоді пропонуємо створити) — і фільтр нічого не знайшов
 * (тоді пропонуємо його скинути). Друге легко сплутати з першим, бо фільтр
 * відновлюється з URL і переживає перезавантаження сторінки.
 */
defineProps({
  /** Чи застосовано зараз хоч один фільтр (рахує той, хто рендерить) */
  filtered: { type: Boolean, default: false },
  /** Родовий відмінок множини: «населених пунктів», «користувачів» */
  entityLabel: { type: String, default: 'записів' },
  canCreate: { type: Boolean, default: false },
  icon: { type: String, default: 'bi-inbox' },
})
defineEmits(['create', 'reset-filters'])
</script>

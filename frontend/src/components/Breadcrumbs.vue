<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <nav aria-label="breadcrumb" class="px-4 py-2 border-bottom flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
    <ol class="breadcrumb mb-0 small">
      <li class="breadcrumb-item">
        <router-link to="/">{{ t('nav.home') }}</router-link>
      </li>

      <!-- Розділ — навмисно не посилання: у menu.json розділи не мають власного
           `to`, це чисті групи для випадайки. Посилання на перший пункт розділу
           вело б не туди, куди написано. -->
      <li v-if="location" class="breadcrumb-item text-muted">
        <i v-if="location.section.icon" :class="['bi', location.section.icon, 'me-1']"></i>{{ location.section.label }}
      </li>

      <li v-if="pageLabel" class="breadcrumb-item active" aria-current="page">
        {{ pageLabel }}
      </li>

      <!-- Відкритий запис. Номер, а не назва: запису може не бути на поточній
           сторінці списку (перехід по прямому посиланню), а тягнути назву
           окремим запитом заради крихти — надто дорого. -->
      <li v-if="recordId" class="breadcrumb-item active" aria-current="page">
        #{{ recordId }}
      </li>
    </ol>
  </nav>
</template>

<script setup>
/**
 * Хлібні крихти з menu.json. Дублювання з `<h5>` на сторінці — свідоме:
 * заголовок називає сторінку, а крихти дають те, чого він не дає, — **розділ**.
 * Прибирати `<h5>` з усіх сторінок заради цього не варто.
 *
 * Компонент живе в BaseLayout, тобто лише на сторінках під авторизацією —
 * на логіні його немає взагалі, окремий `v-if` для цього не потрібен.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import { findMenuLocation } from '@/utils/menuLocation'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const auth = useAuth()

function translateLabel(label) {
  if (!label) return ''
  if (label.includes('.')) {
    const translated = t(label)
    return translated !== label ? translated : label
  }
  return label
}

const location = computed(() => {
  const found = findMenuLocation(route.path)
  if (!found) return null
  // Розділ/пункт, закритий правами, не називаємо — навіть якщо адмін якось
  // опинився на URL. Тоді лишиться сама «Головна».
  if (found.section.permission && !auth.can(found.section.permission)) return null
  if (found.item.permission && !auth.can(found.item.permission)) return null

  // Translate labels
  return {
    ...found,
    section: { ...found.section, label: translateLabel(found.section.label) },
    item: { ...found.item, label: translateLabel(found.item.label) }
  }
})

// Сторінки поза menu.json (`/change-password`, `/dashboard`) — беремо
// `meta.title`, якщо він у маршруту є; інакше лишається сама «Головна».
const pageLabel = computed(() => location.value?.item.label ?? route.meta?.title ?? null)

const recordId = computed(() => route.query.id ?? null)
</script>

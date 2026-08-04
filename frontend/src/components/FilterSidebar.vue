<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <aside class="filter-sidebar" :class="{ collapsed }">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 v-if="!collapsed" class="mb-0">{{ labels.filter }}</h6>
      <button
        class="btn btn-sm btn-link p-0"
        @click="toggleCollapsed"
        :title="collapsed ? labels.expand : labels.collapse"
      >
        <i :class="['bi', collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left']"></i>
      </button>
    </div>

    <template v-if="!collapsed">
      <div v-for="group in groups" :key="group.field" class="mb-3">
        <div class="text-muted small fw-semibold mb-2">{{ group.label }}</div>
        <button
          v-for="item in group.values"
          :key="item.value"
          class="btn btn-sm w-100 text-start d-flex justify-content-between align-items-center mb-1"
          :class="isActive(group.field, item.value) ? 'btn-primary' : 'btn-outline-secondary'"
          @click="$emit('toggle', { field: group.field, value: item.value })"
        >
          <span class="text-truncate">{{ item.label ?? item.value }}</span>
          <span
            class="badge ms-2"
            :class="isActive(group.field, item.value) ? 'bg-light text-dark' : 'bg-secondary'"
          >
            {{ item.count }}
          </span>
        </button>
      </div>
    </template>
  </aside>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
const labels = computed(() => ({
  filter: t('common.filter'),
  expand: t('filters.expand'),
  collapse: t('filters.collapse'),
}))

const props = defineProps({
  /** Namespace для localStorage (щоб різні сторінки не ділили стан) */
  namespace: { type: String, required: true },
  /** Групи фільтрів: [{ field, label, values: [{ value, count, label? }] }] */
  groups: { type: Array, required: true },
  /** Поточні значення фільтрів { field: value } */
  activeFilters: { type: Object, default: () => ({}) },
})

defineEmits(['toggle'])

const STORAGE_KEY = computed(() => `admin.filterSidebar:${props.namespace}`)

const collapsed = ref(false)

function isActive(field, value) {
  return props.activeFilters[field] === value
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY.value, JSON.stringify({ collapsed: collapsed.value }))
}

onMounted(() => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY.value) || '{}')
    if (typeof stored.collapsed === 'boolean') {
      collapsed.value = stored.collapsed
    }
  } catch {
    // Битий JSON — ігноруємо
  }
})
</script>

<style scoped>
.filter-sidebar {
  min-width: 220px;
  max-width: 280px;
  padding: 1rem;
  background: var(--bs-secondary-bg);
  border-right: 1px solid var(--bs-border-color);
  transition: min-width 0.2s, max-width 0.2s;
}

.filter-sidebar.collapsed {
  min-width: 50px;
  max-width: 50px;
}

.filter-sidebar .btn {
  font-size: 0.875rem;
}

.filter-sidebar .text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<template>
  <div class="text-center text-muted py-5">
    <i :class="`bi ${item?.icon ?? 'bi-cone-striped'}`" style="font-size: 2.5rem" />
    <h5 class="mt-3 mb-1">{{ item?.label ?? 'Розділ не знайдено' }}</h5>
    <div v-if="section" class="small mb-3">{{ section.label }}</div>
    <p class="small mb-4">
      <template v-if="item">
        Цей розділ ще не реалізовано.
      </template>
      <template v-else>
        Такої сторінки немає: <code>{{ $route.path }}</code>
      </template>
    </p>
    <router-link to="/dashboard" class="btn btn-sm btn-outline-secondary">
      <i class="bi bi-arrow-left me-1" />
      До панелі управління
    </router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import menuConfig from '@/config/menu.json'

const route = useRoute()

const section = computed(() =>
  menuConfig.find(s => s.items.some(i => i.to === route.path))
)

const item = computed(() =>
  section.value?.items.find(i => i.to === route.path)
)
</script>

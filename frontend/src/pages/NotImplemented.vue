<template>
  <BaseLayout>
    <div class="text-center text-muted py-5">
      <i :class="`bi ${item?.icon ?? 'bi-cone-striped'}`" style="font-size: 2.5rem" />
      <h5 class="mt-3 mb-1">{{ item?.label ?? t('notImplemented.sectionNotFound') }}</h5>
      <div v-if="section" class="small mb-3">{{ section.label }}</div>
      <p class="small mb-4">
        <template v-if="item">
          {{ t('notImplemented.notImplementedVue') }}
        </template>
        <template v-else>
          {{ t('notImplemented.pageNotFound') }} <code>{{ $route.path }}</code>
        </template>
      </p>
      <router-link to="/dashboard" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left me-1" />
        {{ t('notImplemented.backToDashboard') }}
      </router-link>
    </div>
  </BaseLayout>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BaseLayout from '@/layouts/BaseLayout.vue'
import menuConfig from '@/config/menu.json'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

const section = computed(() =>
  menuConfig.find(s => s.items.some(i => i.to === route.path))
)

const item = computed(() =>
  section.value?.items.find(i => i.to === route.path)
)
</script>

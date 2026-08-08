<template>
  <BaseLayout>
    <h5 class="mb-3">{{ t('nav.bookings') }}</h5>
    <p class="text-muted">{{ t('notImplemented.inDevelopment') }}</p>
  </BaseLayout>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import BaseLayout from '@/layouts/BaseLayout.vue'

const { t } = useI18n({ useScope: 'global' })
</script>

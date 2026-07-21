<template>
  <BaseLayout>
    <h5 class="mb-4">Моніторинг системи</h5>
    <SystemHealthWidget />
  </BaseLayout>
</template>

<script setup>
import BaseLayout from '@/layouts/BaseLayout.vue'
import SystemHealthWidget from '@/components/SystemHealthWidget.vue'
</script>

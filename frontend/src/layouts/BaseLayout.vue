<template>
  <div class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
    <TopNav />
    <!-- Поза <main>: <main> прокручується, а крихти мусять лишатись на місці -->
    <Breadcrumbs />
    <main class="flex-grow-1 p-4 bg-light" style="overflow-y: auto; display: flex; flex-direction: column;">
      <slot />
    </main>
  </div>
</template>

<script setup>
import TopNav from '@/components/TopNav.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
</script>
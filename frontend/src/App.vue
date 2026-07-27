<template>
  <router-view v-if="ready" />
  <ToastContainer />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import ToastContainer from '@/components/ToastContainer.vue'

const auth  = useAuth()
const ready = ref(false)

onMounted(async () => {
  if (auth.isAuthenticated()) {
    await auth.fetchMe()
  }
  ready.value = true
})
</script>
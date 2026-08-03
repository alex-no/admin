<template>
  <router-view v-if="ready" />
  <ToastContainer />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import ToastContainer from '@/components/ToastContainer.vue'

const auth  = useAuth()
const theme = useTheme()
const ready = ref(false)

onMounted(async () => {
  // Застосувати тему одразу (index.html виставив атрибут, composable підтверджує)
  theme.apply()

  if (auth.isAuthenticated()) {
    await auth.fetchMe()
  }
  ready.value = true
})
</script>
<template>
  <router-view v-if="ready" :key="localeKey" />
  <ToastContainer />
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import ToastContainer from '@/components/ToastContainer.vue'

const auth  = useAuth()
const theme = useTheme()
const { locale } = useI18n({ useScope: 'global' })
const ready = ref(false)

// Computed key for forcing re-render on locale change
const localeKey = computed(() => locale.value)

// Update document.lang when locale changes
watch(locale, (newLocale) => {
  document.documentElement.lang = newLocale
})

onMounted(async () => {
  // Застосувати тему одразу (index.html виставив атрибут, composable підтверджує)
  theme.apply()

  if (auth.isAuthenticated()) {
    await auth.fetchMe()
  }
  ready.value = true
})
</script>
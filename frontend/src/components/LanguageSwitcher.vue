<template>
  <div class="dropdown">
    <button
      class="btn btn-sm btn-link text-decoration-none dropdown-toggle"
      type="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      :title="t('language.selectLanguage')"
    >
      <i class="bi bi-translate me-1"></i>
      {{ currentLocaleName }}
    </button>
    <ul class="dropdown-menu dropdown-menu-end">
      <li v-for="loc in availableLocales" :key="loc.code">
        <a
          class="dropdown-item"
          :class="{ active: locale === loc.code }"
          href="#"
          @click.prevent="changeLocale(loc.code)"
        >
          {{ loc.name }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { availableLocales } from '@locales'

const { locale, t } = useI18n({ useScope: 'global' })

const currentLocaleName = computed(() => {
  const current = availableLocales.find(l => l.code === locale.value)
  return current ? current.name : 'UK'
})

function changeLocale(newLocale) {
  console.log('[LanguageSwitcher] Changing locale from', locale.value, 'to', newLocale)
  locale.value = newLocale
  localStorage.setItem('admin.locale', newLocale)
  document.documentElement.lang = newLocale
  console.log('[LanguageSwitcher] Changed. Current locale:', locale.value)
  console.log('[LanguageSwitcher] Test translation:', t('common.save'))
}
</script>

<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="isOpen"
    storage-key="change-client-type-modal"
    header-class="bg-primary text-white"
    :default-width="400"
    :min-width="320"
    :max-width="600"
    :default-height="350"
    :min-height="250"
    :max-height="600"
  >
    <template #title>
      <h6 class="mb-0">{{ t('analytics.changeTypeModalTitle') }}</h6>
    </template>

    <div class="d-grid gap-2">
      <button
        v-for="type in types"
        :key="type.value"
        class="btn btn-outline-secondary text-start d-flex align-items-center gap-2"
        :class="{ 'btn-primary text-white': type.value === currentType }"
        @click="select(type.value)"
      >
        <span style="font-size: 1.2em">{{ type.icon }}</span>
        <span>{{ type.label }}</span>
        <span v-if="type.value === currentType" class="ms-auto badge bg-light text-dark">{{ t('analytics.current') }}</span>
      </button>
    </div>

    <template #footer>
      <div></div>
      <button class="btn btn-sm btn-outline-secondary" @click="close">{{ t('common.cancel') }}</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from './BaseModal.vue'

const { t } = useI18n({ useScope: 'global' })

// Component state
const isOpen = ref(false)
const currentType = ref(null)
const recordId = ref(null)
const resolve = ref(null)

// Закриття через хрестик/бекдроп/Escape всередині BaseModal минає close() нижче
// (там лише isOpen.value = false — сам BaseModal керує цим через v-model) — тому
// resolve() проміса й прибирання стану винесені сюди, в один watcher на будь-яке
// закриття, а не дублюються по кожній кнопці/обробнику окремо.
watch(isOpen, (val, wasOpen) => {
  if (wasOpen && !val) {
    resolve.value?.(null)
    resolve.value = null
    recordId.value = null
    currentType.value = null
  }
})

const types = computed(() => [
  { value: 'human', icon: '👤', label: t('analytics.clientTypePlain.human') },
  { value: 'bot', icon: '🤖', label: t('analytics.clientTypePlain.bot') },
  { value: 'suspicious', icon: '⚠️', label: t('analytics.clientTypePlain.suspicious') },
  { value: 'unknown', icon: '❓', label: t('analytics.clientTypePlain.unknown') },
])

function open(id, current) {
  recordId.value = id
  currentType.value = current
  isOpen.value = true
  return new Promise((res) => {
    resolve.value = res
  })
}

function select(type) {
  resolve.value?.(type)
  resolve.value = null
  close()
}

function close() {
  isOpen.value = false
}

onMounted(() => {
  // Listen for event from parent
  window.addEventListener('open-change-client-type', (e) => {
    open(e.detail.id, e.detail.currentType).then((newType) => {
      if (newType) {
        window.dispatchEvent(
          new CustomEvent('client-type-selected', {
            detail: { id: e.detail.id, newType }
          })
        )
      }
    })
  })
})

defineExpose({ open })
</script>

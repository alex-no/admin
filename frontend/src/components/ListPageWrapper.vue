<template>
  <BaseLayout>
    <div :style="wrapperStyle" class="list-page-wrapper">
      <slot />
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'
import { usePageLayout } from '@/composables/usePageLayout'

const { contentMargin } = usePageLayout()

// Дополнительный margin от модалок
const modalMargin = ref({})

// Объединяем contentMargin с modalMargin и обязательными стилями для корректного скроллинга
const wrapperStyle = computed(() => ({
  ...contentMargin.value,
  ...modalMargin.value,
  flex: '1',
  minHeight: '0',
  overflowY: 'scroll',
  overflowX: 'hidden',
}))

// Слушаем события от модалок
function handleModalMarginChange(e) {
  modalMargin.value = e.detail || {}
}

onMounted(() => {
  window.addEventListener('modal-content-margin-change', handleModalMarginChange)
})

onUnmounted(() => {
  window.removeEventListener('modal-content-margin-change', handleModalMarginChange)
})
</script>

<style scoped>
.list-page-wrapper {
  /* Основные стили для flex-контейнера */
  flex: 1;
  min-height: 0;
  overflow-y: scroll;
  overflow-x: hidden;

  /* Плавный переход при изменении margin (когда открывается drawer) */
  transition: margin 0.3s ease;
}

/* Убираем отступы у последнего элемента */
.list-page-wrapper > :last-child {
  margin-bottom: 0;
}
</style>

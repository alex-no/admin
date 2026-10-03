<template>
  <div class="alert alert-warning d-flex align-items-start gap-2 py-2 small mb-3" role="note">
    <i class="bi bi-info-circle mt-1"></i>
    <span>{{ t('analytics.demoNotice') }}</span>
  </div>
</template>

<script setup>
/**
 * Плашка «демо-дані» над розділами Аналітика / Логи помилок: усі їхні записи генерує
 * backend/data/fake_analytics.php при старті бекенду, справжні запити сюди не пишуться.
 * Дзеркало React: components/DemoDataNotice.tsx.
 */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

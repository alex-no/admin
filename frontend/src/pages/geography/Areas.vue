<template>
  <AreaRegionList :cfg="cfg" :title="t('areaRegionList.regionsTitle')" :hasAreaFilter="false" />
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import AreaRegionList from './AreaRegionList.vue'
import cfg from './areas.config.json'

const { t } = useI18n({ useScope: 'global' })
</script>

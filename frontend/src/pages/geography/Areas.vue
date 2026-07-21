<template>
  <AreaRegionList :cfg="cfg" title="Регіони" :hasAreaFilter="false" />
</template>

<script setup>
import AreaRegionList from './AreaRegionList.vue'
import cfg from './areas.config.json'
</script>

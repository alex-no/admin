<template>
  <AreaRegionList :cfg="cfg" title="Райони" :hasAreaFilter="true" />
</template>

<script setup>
import AreaRegionList from './AreaRegionList.vue'
import cfg from './districts.config.json'
</script>

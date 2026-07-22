<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <ListPageWrapper>
    <DataListPage
      title="Реєстр даних"
      :api-list="cfg.apiList"
      :api-update="cfg.apiUpdate"
      :api-delete="cfg.apiDelete"
      :filter-config="filterConfig"
      :columns-config="columnsConfig"
      :actions="cfg.actions"
      :per-page="10"
      @row-action="onRowAction"
    />
  </ListPageWrapper>

  <BaseModal
    v-model:visible="detailOpen"
    storage-key="sto-registry-detail"
    :default-width="600"
    :min-width="420"
    :max-width="900"
  >
    <template #title>
      <h5 class="mb-0">
        СТО <span class="text-muted fw-normal fs-6">#{{ detailRow?.id }}</span>
        <span v-if="detailRow?.name_uk" class="text-primary fw-normal fs-6 ms-2">{{ detailRow.name_uk }}</span>
      </h5>
    </template>

    <dl class="row mb-0 small" v-if="detailRow">
      <dt class="col-4">Тип</dt>       <dd class="col-8">{{ detailRow.sto_type ?? '—' }}</dd>
      <dt class="col-4">Адреса</dt>    <dd class="col-8">{{ detailRow.address ?? '—' }}</dd>
      <dt class="col-4">Телефон</dt>   <dd class="col-8">{{ detailRow.main_phone ?? '—' }}</dd>
      <dt class="col-4">Рейтинг</dt>   <dd class="col-8">{{ detailRow.rating ?? '—' }}</dd>
      <dt class="col-4">Статус</dt>    <dd class="col-8">{{ detailRow.is_active ? 'Активне' : 'Неактивне' }}</dd>
    </dl>

    <template #footer>
      <div></div>
      <button class="btn btn-sm btn-secondary" @click="detailOpen = false">Закрити</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import BaseModal from '@/components/BaseModal.vue'
import DataListPage from '@/list-framework/DataListPage.vue'
import filterConfig from './sto-registry.filter.json'
import columnsConfig from './sto-registry.columns.json'
import cfg from './sto-registry.config.json'

const detailOpen = ref(false)
const detailRow = ref(null)

function onRowAction({ type, row }) {
  if (type === 'detail') {
    detailRow.value = row
    detailOpen.value = true
  }
}
</script>

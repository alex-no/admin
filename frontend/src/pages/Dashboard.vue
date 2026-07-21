<template>
  <BaseLayout>
    <h5 class="mb-4">Панель управління</h5>
    <SystemHealthWidget v-if="auth.can(P.system.monitoringView)" />
    <div class="row g-3">
      <div v-for="section in visibleMenu" :key="section.id" class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <div class="mb-3">
              <i :class="['bi', section.icon, 'fs-2', 'text-primary']"></i>
            </div>
            <h6 class="card-title">{{ section.label }}</h6>
            <ul class="list-unstyled mt-auto mb-0">
              <li v-for="item in section.items.filter(i => auth.can(i.permission))" :key="item.to">
                <router-link :to="item.to" class="text-decoration-none small">
                  <i :class="['bi', item.icon, 'me-1', 'text-muted']"></i>
                  {{ item.label }}
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseLayout from '@/layouts/BaseLayout.vue'
import SystemHealthWidget from '@/components/SystemHealthWidget.vue'
import menu from '@/config/menu'
import P from '@/config/permissions'

const auth = useAuth()

const visibleMenu = computed(() =>
  menu.filter(s => auth.can(s.permission))
)
</script>

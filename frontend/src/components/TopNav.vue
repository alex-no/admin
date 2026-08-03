<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark px-3 py-0">
    <!-- Brand -->
    <router-link class="navbar-brand fw-bold me-4" to="/">
      Oleksandr Nosov <span class="text-secondary fw-normal small">Admin</span>
    </router-link>

    <!-- Top-level menu items -->
    <div class="collapse navbar-collapse">
      <ul class="navbar-nav me-auto">
        <li
          v-for="section in visibleMenu"
          :key="section.id"
          class="nav-item dropdown"
          @mouseenter="openMenu = section.id"
          @mouseleave="openMenu = null"
        >
          <a
            class="nav-link dropdown-toggle px-3 py-3"
            :class="{ active: activeSection === section.id }"
            href="#"
            @click.prevent="openMenu = openMenu === section.id ? null : section.id"
          >
            <i :class="['bi', section.icon, 'me-1']"></i>
            {{ section.label }}
          </a>
          <!-- Second level -->
          <ul
            class="dropdown-menu mt-0"
            :class="{ show: openMenu === section.id }"
          >
            <li v-for="item in section.items.filter(i => auth.can(i.permission))" :key="item.to">
              <router-link
                class="dropdown-item"
                :to="item.to"
                @click="openMenu = null"
              >
                <i :class="['bi', item.icon, 'me-2', 'text-muted']"></i>
                {{ item.label }}
              </router-link>
            </li>
          </ul>
        </li>
      </ul>

      <!-- User block -->
      <div class="d-flex align-items-center gap-3">
        <!-- Theme toggle -->
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :title="themeTitle"
          @click="theme.cycle"
        >
          <i class="bi" :class="themeIcon"></i>
        </button>

        <div class="dropdown">
          <button
            class="btn btn-sm btn-outline-secondary dropdown-toggle"
            type="button"
            @click="userMenuOpen = !userMenuOpen"
          >
            <i class="bi bi-person-circle me-1"></i>
            {{ auth.user.value?.name }}
          </button>
          <ul class="dropdown-menu dropdown-menu-end" :class="{ show: userMenuOpen }">
            <li>
              <router-link class="dropdown-item" to="/change-password" @click="userMenuOpen = false">
                <i class="bi bi-key me-2"></i>Змінити пароль
              </router-link>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent="doLogout">
                <i class="bi bi-box-arrow-right me-2"></i>Вийти
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import menu from '@/config/menu.json'
import { findMenuLocation } from '@/utils/menuLocation'

const auth   = useAuth()
const theme  = useTheme()
const route  = useRoute()
const router = useRouter()

const openMenu = ref(null)
const userMenuOpen = ref(false)

const visibleMenu = computed(() =>
  menu.filter(s => auth.can(s.permission))
)

// Через findMenuLocation, а не голий startsWith: `/sto-managers` збігався б із
// `/sto` і підсвічував чужий розділ (див. utils/menuLocation.js).
const activeSection = computed(() => findMenuLocation(route.path)?.section.id ?? null)

const themeIcon = computed(() => {
  if (theme.mode.value === 'light') return 'bi-sun-fill'
  if (theme.mode.value === 'dark') return 'bi-moon-stars-fill'
  return 'bi-circle-half'
})

const themeTitle = computed(() => {
  if (theme.mode.value === 'light') return 'Світла тема'
  if (theme.mode.value === 'dark') return 'Темна тема'
  return 'Авто (за системою)'
})

async function doLogout() {
  auth.logout()
  await router.push('/login')
}
</script>

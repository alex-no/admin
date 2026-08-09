import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',          redirect: '/dashboard' },
  { path: '/login',     name: 'Login',     component: () => import('../pages/Login.vue'),     meta: { public: true } },
  { path: '/first-login', name: 'FirstLogin', component: () => import('../pages/FirstLogin.vue'), meta: { public: true } },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('../pages/ForgotPassword.vue'), meta: { public: true, requiresGuest: true } },
  { path: '/set-password', name: 'SetPassword', component: () => import('../pages/SetPassword.vue'), meta: { public: true } },
  { path: '/change-password', name: 'ChangePassword', component: () => import('../pages/ChangePassword.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('../pages/Dashboard.vue') },
  { path: '/sto',          name: 'StoList',     component: () => import('../pages/StoList.vue')     },
  { path: '/data-registry', name: 'DataRegistry', component: () => import('../pages/StoRegistry.vue') },
  { path: '/roles', name: 'RoleManagement', component: () => import('../pages/RoleManagement.vue') },
  { path: '/permissions', name: 'PermissionList', component: () => import('../pages/PermissionList.vue') },

  // System / Error Logs
  { path: '/error-logs',       name: 'ErrorLogs',      component: () => import('../pages/ErrorLogs.vue')      },
  { path: '/error-logs/stats', name: 'ErrorLogStats',  component: () => import('../pages/ErrorLogStats.vue')  },

  // Analytics
  { path: '/analytics',            name: 'Analytics',           component: () => import('../pages/Analytics.vue')           },
  { path: '/analytics/stats',      name: 'AnalyticsStats',      component: () => import('../pages/AnalyticsStats.vue')      },
  { path: '/analytics/charts',     name: 'AnalyticsCharts',     component: () => import('../pages/AnalyticsCharts.vue')     },

  // Test pages
  { path: '/test-facets', name: 'TestFacets', component: () => import('../pages/TestFacets.vue') },
  { path: '/test-i18n', name: 'TestI18n', component: () => import('../pages/TestI18n.vue') },

  // Dev Tools
  { path: '/api-docs-admin', name: 'ApiDocsAdmin', component: () => import('../pages/ApiDocsAdmin.vue') },

  // 404 catch-all
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../pages/NotImplemented.vue') },
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token')
  if (!to.meta.public && !token) {
    return { name: 'Login' }
  }
  // Redirect logged-in users from guest pages
  if (to.meta.requiresGuest && token) {
    return { name: 'Dashboard' }
  }
  if (to.name === 'Login' && token) {
    return { name: 'Dashboard' }
  }
})

export default router

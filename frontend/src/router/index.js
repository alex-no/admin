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
  { path: '/sto/import',        name: 'StoImport',        component: () => import('../pages/StoImport.vue')        },
  { path: '/sto/outreach',      name: 'StoOutreach',      component: () => import('../pages/StoOutreach.vue')      },
  { path: '/sto/applications', name: 'StoApplications', component: () => import('../pages/StoApplications.vue') },
  { path: '/bookings',  name: 'Bookings',  component: () => import('../pages/Bookings.vue')  },
  { path: '/users',     name: 'Users',     component: () => import('../pages/Users.vue')     },
  { path: '/sto-managers', name: 'StoManagers', component: () => import('../pages/StoManagers.vue') },
  { path: '/admin-management', name: 'AdminManagement', component: () => import('../pages/AdminManagement.vue') },
  { path: '/roles', name: 'RoleManagement', component: () => import('../pages/RoleManagement.vue') },
  { path: '/permissions', name: 'PermissionList', component: () => import('../pages/PermissionList.vue') },

  // Geography
  { path: '/geography/countries',   name: 'Countries',  component: () => import('../pages/geography/Countries.vue')  },
  { path: '/geography/areas',       name: 'Areas',      component: () => import('../pages/geography/Areas.vue')      },
  { path: '/geography/districts',   name: 'Districts',  component: () => import('../pages/geography/Districts.vue')  },
  { path: '/geography/cities',      name: 'Cities',     component: () => import('../pages/geography/Cities.vue')     },
  { path: '/geography/city-types',       name: 'CityTypes',      component: () => import('../pages/geography/CityTypes.vue')      },
  { path: '/geography/city-tmp-review', name: 'CityTmpReview', component: () => import('../pages/geography/CityTmpReview.vue') },
  { path: '/geography/timezones',       name: 'Timezones',    component: () => import('../pages/geography/Timezones.vue')    },

  // Catalog
  { path: '/catalog/vehicle-types', name: 'VehicleTypes', component: () => import('../pages/catalog/VehicleTypes.vue') },
  { path: '/catalog/car-brands',    name: 'CarBrands',    component: () => import('../pages/catalog/CarBrands.vue')    },
  { path: '/catalog/car-models',    name: 'CarModels',    component: () => import('../pages/catalog/CarModels.vue')    },
  { path: '/catalog/service-groups', name: 'ServiceGroups', component: () => import('../pages/catalog/ServiceGroups.vue') },
  { path: '/catalog/services',       name: 'Services',      component: () => import('../pages/catalog/Services.vue')      },

  // System / Error Logs
  { path: '/error-logs',       name: 'ErrorLogs',      component: () => import('../pages/ErrorLogs.vue')      },
  { path: '/error-logs/stats', name: 'ErrorLogStats',  component: () => import('../pages/ErrorLogStats.vue')  },

  // Analytics
  { path: '/analytics',            name: 'Analytics',           component: () => import('../pages/Analytics.vue')           },
  { path: '/analytics/stats',      name: 'AnalyticsStats',      component: () => import('../pages/AnalyticsStats.vue')      },
  { path: '/analytics/charts',     name: 'AnalyticsCharts',     component: () => import('../pages/AnalyticsCharts.vue')     },

  // Feedback
  { path: '/feedback', name: 'Feedback', component: () => import('../pages/Feedback.vue') },
  { path: '/feedback/stats', name: 'FeedbackStats', component: () => import('../pages/FeedbackStats.vue') },
  { path: '/news', name: 'News', component: () => import('../pages/News.vue') },

  // Reviews
  { path: '/reviews', name: 'Reviews', component: () => import('../pages/Reviews.vue') },

  // Dev Tools
  { path: '/api-docs-admin', name: 'ApiDocsAdmin', component: () => import('../pages/ApiDocsAdmin.vue') },
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

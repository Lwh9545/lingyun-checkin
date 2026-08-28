import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/checkin'
  },
  {
    path: '/checkin',
    name: 'Checkin',
    component: () => import('../views/Checkin.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/finance',
    name: 'Finance',
    component: () => import('../views/Finance.vue')
  },
  {
    path: '/salary',
    redirect: '/finance'
  },
  {
    path: '/reimbursement',
    redirect: '/finance'
  },
  {
    path: '/records',
    redirect: '/dashboard'
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue')
  },
  {
    path: '/cloud',
    name: 'Cloud',
    component: () => import('../views/Cloud.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

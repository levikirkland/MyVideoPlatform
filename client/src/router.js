import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Register from './views/Register.vue'
import VideoDetail from './views/VideoDetail.vue'
import Upload from './views/Upload.vue'
import ModerationQueue from './views/ModerationQueue.vue'
import Favorites from './views/Favorites.vue'
import Terms from './views/Terms.vue'
import Privacy from './views/Privacy.vue'
import Compliance from './views/Compliance.vue'
import History from './views/History.vue'
import Profile from './views/Profile.vue'
import PublicProfile from './views/PublicProfile.vue'
import Membership from './views/Membership.vue'
import AdminDashboard from './views/admin/Dashboard.vue'
import AdminCategories from './views/admin/Categories.vue'
import AdminTags from './views/admin/Tags.vue'
import AdminUsers from './views/admin/Users.vue'
import AdminAuditLogs from './views/admin/AuditLogs.vue'
import AdminRemovalRequests from './views/admin/RemovalRequests.vue'
import AdminCreatorRequests from './views/admin/CreatorRequests.vue'
import CreatorDashboard from './views/CreatorDashboard.vue'
import { useAuthStore } from './store/auth'

const routes = [
  { path: '/', component: Home },
  { 
    path: '/community', 
    component: Home, 
    props: { community: true },
    meta: { requiresAuth: true }
  },
  { path: '/trending', component: Home, props: { sort: 'trending' } },
  { path: '/new', component: Home, props: { sort: 'newest' } },
  { path: '/top-rated', component: Home, props: { sort: 'top_rated' } },
  { path: '/category/:category', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/video/:id', component: VideoDetail },
  { path: '/user/:id', component: PublicProfile },
  { 
    path: '/upload', 
    component: Upload,
    meta: { requiresAuth: true }
  },
  {
    path: '/creator/dashboard',
    component: CreatorDashboard,
    meta: { requiresAuth: true, requiresRole: ['creator'] }
  },
  { 
    path: '/moderation', 
    component: ModerationQueue,
    meta: { requiresAuth: true, requiresRole: ['moderator', 'admin'] }
  },
  { 
    path: '/moderation/flags', 
    component: ModerationQueue,
    meta: { requiresAuth: true, requiresRole: ['moderator', 'admin'] }
  },
  {
    path: '/favorites',
    component: Favorites,
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    component: History,
    meta: { requiresAuth: true }
  },
  {
    path: '/membership',
    component: Membership,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  { path: '/terms', component: Terms },
  { path: '/privacy', component: Privacy },
  { path: '/compliance', component: Compliance },
  {
    path: '/admin/dashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/admin/categories',
    component: AdminCategories,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/admin/tags',
    component: AdminTags,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/admin/users',
    component: AdminUsers,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/admin/logs',
    component: AdminAuditLogs,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/admin/removal-requests',
    component: AdminRemovalRequests,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/admin/creator-requests',
    component: AdminCreatorRequests,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresRole && !to.meta.requiresRole.includes(authStore.user?.role)) {
    next('/')
  } else {
    next()
  }
})

export default router

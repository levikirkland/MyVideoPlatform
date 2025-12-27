import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { setupAxiosInterceptors } from './plugins/axios'
import { useAuthStore } from './store/auth'
import './assets/main.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

// Initialize auth and setup axios interceptors
const authStore = useAuthStore()
authStore.initializeAuth()
setupAxiosInterceptors(authStore)

app.use(router)
app.use(vuetify)

app.mount('#app')

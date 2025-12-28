import axios from 'axios'

// Create a custom instance with base URL
const instance = axios.create({
  baseURL: '/api/v1'
})

export function setupAxiosInterceptors(authStore) {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid, logout - but don't redirect if already on login/register
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/register') {
          authStore.logout()
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )
}

export default instance


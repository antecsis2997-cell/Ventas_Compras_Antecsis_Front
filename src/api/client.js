import axios from 'axios'

// Ajusta esta URL si tu backend corre en otro host/puerto
const API_URL = 'http://localhost:8080'

const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api


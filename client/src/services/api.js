import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('psych_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// ─── Tasks API ───────────────────────────────────────────────────────────────
export const tasksApi = {
  getTasks: () => api.get('/tasks'),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  reorderTasks: (tasks) => api.patch('/tasks/reorder', { tasks }),
};

export default api;

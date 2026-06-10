import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem('access_token', data.access_token);
          err.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(err.config);
        } catch { localStorage.clear(); window.location.href = '/login'; }
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (u, p) => api.post('/auth/login', { username: u, password: p });
export const logout = () => api.post('/auth/logout');

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getCrimeTrends = () => api.get('/dashboard/crime-trends');
export const getOfficerWorkload = () => api.get('/dashboard/officer-workload');

// Cases
export const getCases = (params) => api.get('/cases', { params });
export const getCaseById = (id) => api.get(`/cases/${id}`);
export const getCaseTimeline = (id) => api.get(`/cases/${id}/timeline`);
export const getCaseEvidence = (id) => api.get(`/cases/${id}/evidence`);
export const updateCaseStatus = (id, status, remarks) => api.patch(`/cases/${id}/status`, { status, remarks });
export const registerCase = (data) => api.post('/cases/register', data);

// FIR
export const getFIRs = (params) => api.get('/fir', { params });
export const getFIRById = (id) => api.get(`/fir/${id}`);

// Criminals
export const getCriminals = (params) => api.get('/criminals', { params });
export const getCriminalById = (id) => api.get(`/criminals/${id}`);
export const getRepeatOffenders = () => api.get('/criminals/repeat-offenders');
export const addCriminalRelation = (id, data) => api.post(`/criminals/${id}/relations`, data);

// Evidence
export const getEvidenceById = (id) => api.get(`/evidence/${id}`);
export const updateCustody = (id, data) => api.patch(`/evidence/${id}/custody`, data);

// Officers
export const getOfficers = () => api.get('/officers');
export const getOfficerWorkloadById = (id) => api.get(`/officers/${id}/workload`);

// Audit
export const getAuditLogs = (params) => api.get('/audit', { params });

// Analytics helpers (compose from existing endpoints)
export const getAnalytics = async () => {
  const [stats, trends, workload] = await Promise.all([
    getDashboardStats(),
    getCrimeTrends(),
    getOfficerWorkload(),
  ]);
  return { stats: stats.data, trends: trends.data, workload: workload.data };
};

export default api;

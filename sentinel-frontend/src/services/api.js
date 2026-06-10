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
export const createCase = (data) => api.post('/cases', data);
export const updateCase = (id, data) => api.put(`/cases/${id}`, data);
export const deleteCase = (id) => api.delete(`/cases/${id}`);

// FIR
export const getFIRs = (params) => api.get('/fir', { params });
export const getFIRById = (id) => api.get(`/fir/${id}`);
export const createFIR = (data) => api.post('/fir', data);
export const updateFIR = (id, data) => api.put(`/fir/${id}`, data);
export const deleteFIR = (id) => api.delete(`/fir/${id}`);
export const getCrimeTypes = () => api.get('/fir/crime-types');
export const getStations = () => api.get('/fir/stations');

// Criminals
export const getCriminals = (params) => api.get('/criminals', { params });
export const getCriminalById = (id) => api.get(`/criminals/${id}`);
export const getRepeatOffenders = () => api.get('/criminals/repeat-offenders');
export const addCriminalRelation = (id, data) => api.post(`/criminals/${id}/relations`, data);

// Evidence
export const getEvidence = (params) => api.get('/evidence', { params });
export const getEvidenceById = (id) => api.get(`/evidence/${id}`);
export const getEvidenceTypes = () => api.get('/evidence/types');
export const createEvidence = (data) => api.post('/evidence', data);
export const updateEvidence = (id, data) => api.put(`/evidence/${id}`, data);
export const deleteEvidence = (id) => api.delete(`/evidence/${id}`);
export const updateCustody = (id, data) => api.patch(`/evidence/${id}/custody`, data);

// Criminals
export const createCriminal = (data) => api.post('/criminals', data);
export const updateCriminal = (id, data) => api.put(`/criminals/${id}`, data);
export const deleteCriminal = (id) => api.delete(`/criminals/${id}`);

// Officers
export const getOfficers = () => api.get('/officers');
export const getOfficerWorkloadById = (id) => api.get(`/officers/${id}/workload`);

// Court
export const getCourts = () => api.get('/court/courts');
export const getProceedings = (params) => api.get('/court/proceedings', { params });
export const createProceeding = (data) => api.post('/court/proceedings', data);
export const deleteProceeding = (id) => api.delete(`/court/proceedings/${id}`);
export const getJudgments = () => api.get('/court/judgments');
export const createJudgment = (data) => api.post('/court/judgments', data);

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

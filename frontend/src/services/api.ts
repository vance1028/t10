import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request.post('/auth/login', data),
  getProfile: () => request.get('/auth/profile')
};

export const userApi = {
  getList: () => request.get('/users'),
  getProjectManagers: () => request.get('/users/project-managers')
};

export const donationApi = {
  getList: (params?: any) => request.get('/donations', { params }),
  getDetail: (id: number) => request.get(`/donations/${id}`),
  create: (data: any) => request.post('/donations', data),
  confirm: (id: number, data?: any) => request.post(`/donations/${id}/confirm`, data),
  getDonors: (params?: any) => request.get('/donations/donors/list', { params }),
  createDonor: (data: any) => request.post('/donations/donors', data)
};

export const projectApi = {
  getList: (params?: any) => request.get('/projects', { params }),
  getDetail: (id: number) => request.get(`/projects/${id}`),
  create: (data: any) => request.post('/projects', data),
  update: (id: number, data: any) => request.put(`/projects/${id}`, data),
  getAllocations: (id: number) => request.get(`/projects/${id}/allocations`),
  applyAllocation: (data: any) => request.post('/projects/allocations/apply', data),
  getApplications: (params?: any) => request.get('/projects/allocations/applications', { params }),
  financeReview: (id: number, data: any) => request.post(`/projects/allocations/applications/${id}/finance-review`, data),
  adminApprove: (id: number, data: any) => request.post(`/projects/allocations/applications/${id}/admin-approve`, data)
};

export const fundApi = {
  getPools: () => request.get('/funds/pools'),
  getPoolFlows: (id: number, params?: any) => request.get(`/funds/pools/${id}/flows`, { params }),
  getBeneficiaries: (params?: any) => request.get('/funds/beneficiaries', { params }),
  createBeneficiary: (data: any) => request.post('/funds/beneficiaries', data),
  getExpenditures: (params?: any) => request.get('/funds/expenditures', { params }),
  createExpenditure: (data: any) => request.post('/funds/expenditures', data)
};

export const auditApi = {
  getTrailByDonation: (id: number) => request.get(`/audit/trail/donation/${id}`),
  getTrailByBeneficiary: (id: number) => request.get(`/audit/trail/beneficiary/${id}`),
  getAllFlows: (params?: any) => request.get('/audit/flows/all', { params }),
  getOperationLogs: (params?: any) => request.get('/audit/operation-logs', { params }),
  exportProjectReport: (id: number) =>
    request.get(`/audit/reports/project/${id}/export`, { responseType: 'blob' }),
  getStatistics: () => request.get('/audit/statistics/summary')
};

export default request;

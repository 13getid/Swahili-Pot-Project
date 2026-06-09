import api from './axios';

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const createAdminUser = (data) => api.post('/admin/users', data);
export const suspendAdminUser = (id) => api.patch(`/admin/users/${id}/suspend`);
export const resetAdminUserPassword = (id, data) =>
  api.patch(`/admin/users/${id}/reset-password`, data);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);

// --- Audit log ---
export const getAuditLog = (params) => api.get('/admin/audit', { params });
export const getAuditActions = () => api.get('/admin/audit/actions');
export const auditExportUrl = (params) => {
  const qs = new URLSearchParams(params || {}).toString();
  return `${api.defaults.baseURL}/admin/audit/export${qs ? `?${qs}` : ''}`;
};

// --- Departments ---
export const getAdminDepartments = () => api.get('/admin/departments');
export const createAdminDepartment = (data) => api.post('/admin/departments', data);
export const updateAdminDepartment = (id, data) => api.patch(`/admin/departments/${id}`, data);
export const deleteAdminDepartment = (id) => api.delete(`/admin/departments/${id}`);

// --- Platform settings ---
export const getPlatformSettings = () => api.get('/admin/settings');
export const updatePlatformSettings = (data) => api.put('/admin/settings', data);

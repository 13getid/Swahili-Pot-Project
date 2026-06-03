import api from './axios';

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const createAdminUser = (data) => api.post('/admin/users', data);
export const suspendAdminUser = (id) => api.patch(`/admin/users/${id}/suspend`);
export const resetAdminUserPassword = (id, data) =>
  api.patch(`/admin/users/${id}/reset-password`, data);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);

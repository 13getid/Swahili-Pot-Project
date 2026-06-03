import api from './axios';

export const getSubmissions = () => api.get('/submissions');
export const createSubmission = (formData) =>
  api.post('/submissions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const acknowledgeSubmission = (id, data) => api.patch(`/submissions/${id}/acknowledge`, data);
export const returnSubmission = (id, data) => api.patch(`/submissions/${id}/return`, data);
export const fileUrl = (id) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/submissions/${id}/file`;

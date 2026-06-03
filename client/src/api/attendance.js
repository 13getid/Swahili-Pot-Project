import api from './axios';

// Instructor / supervisor (authenticated)
export const createSession = (data) => api.post('/attendance/sessions', data);
export const getSessions = () => api.get('/attendance/sessions');
export const getSupervisorSessions = () => api.get('/attendance/sessions/supervisor-view');
export const getSessionRecords = (id) => api.get(`/attendance/sessions/${id}/records`);
export const confirmRecord = (id) => api.patch(`/attendance/records/${id}/confirm`);

// Public attendance (no auth)
export const getAttendSession = (token) => api.get(`/attend/${token}`);
export const checkIn = (token, data) => api.post(`/attend/${token}`, data);
export const checkOut = (recordId, checkOutIso) =>
  api.patch(`/attendance/records/${recordId}/checkout`, { check_out: checkOutIso });

import api from './axios';

export const getDowntimeReports = () => api.get('/downtime');
export const createDowntimeReport = (data) => api.post('/downtime', data);
export const resolveDowntimeReport = (id, data) => api.patch(`/downtime/${id}/resolve`, data);

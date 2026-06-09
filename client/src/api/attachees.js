import api from './axios';

// Staff-facing attachee management (role: instructor / supervisor)
export const getAttachees = () => api.get('/attachees');
export const getDeptStaff = () => api.get('/attachees/meta/staff');
export const getAttachee = (id) => api.get(`/attachees/${id}`);
export const getAttacheeSummary = (id) => api.get(`/attachees/${id}/summary`);
export const createAttachee = (data) => api.post('/attachees', data);
export const updateAttachee = (id, data) => api.patch(`/attachees/${id}`, data);
export const deactivateAttachee = (id) => api.patch(`/attachees/${id}/deactivate`);
export const getAttacheeNotes = (id) => api.get(`/attachees/${id}/notes`);
export const addAttacheeNote = (id, body) => api.post(`/attachees/${id}/notes`, { body });

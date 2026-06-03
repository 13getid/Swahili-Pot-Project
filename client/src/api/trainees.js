import api from './axios';

export const getTrainees = () => api.get('/trainees');
export const createTrainee = (data) => api.post('/trainees', data);
export const deactivateTrainee = (id) => api.delete(`/trainees/${id}`);

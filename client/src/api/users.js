import api from './axios';

export const getInstructors = () => api.get('/users/instructors');
export const createInstructor = (data) => api.post('/users/instructors', data);
export const toggleInstructor = (id) => api.patch(`/users/instructors/${id}/toggle`);

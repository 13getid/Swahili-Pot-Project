import api from './axios';

export const getNotifications = (limit = 20) =>
  api.get('/notifications', { params: { limit } });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

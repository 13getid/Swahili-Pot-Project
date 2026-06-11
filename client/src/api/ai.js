import api from './axios';

export const getAttacheeProfile = (attacheeId) =>
  api.get(`/ai/attachees/${attacheeId}/profile`);
// Generation streams over SSE (keep-alive) so it never hits the proxy timeout.
export const profileGenerateUrl = (attacheeId) =>
  `${api.defaults.baseURL}/ai/attachees/${attacheeId}/profile/generate`;
export const generateReport = (attacheeId, reportType) =>
  api.post(`/ai/attachees/${attacheeId}/reports`, { report_type: reportType });
export const saveReport = (reportId, data) => api.patch(`/ai/reports/${reportId}`, data);
export const getAttacheeReports = (attacheeId) =>
  api.get(`/ai/attachees/${attacheeId}/reports`);
export const reportExportUrl = (reportId) =>
  `${api.defaults.baseURL}/ai/reports/${reportId}/export`;

// --- Threaded supervisor assistant conversations ---
export const getConversations = () => api.get('/ai/assistant/conversations');
export const getConversation = (id) => api.get(`/ai/assistant/conversations/${id}`);
export const deleteConversation = (id) => api.delete(`/ai/assistant/conversations/${id}`);
export const clearAssistantHistory = () => api.delete('/ai/assistant/history');

// --- AI availability + usage (system admin) ---
export const getAIEnabled = () => api.get('/ai/usage/enabled');
export const getAIUsage = (params) => api.get('/ai/usage', { params });

// SSE streaming uses fetch (axios can't stream response bodies in the browser).
export const assistantStreamUrl = () => `${api.defaults.baseURL}/ai/assistant`;
export const reportStreamUrl = (attacheeId) =>
  `${api.defaults.baseURL}/ai/attachees/${attacheeId}/reports/stream`;

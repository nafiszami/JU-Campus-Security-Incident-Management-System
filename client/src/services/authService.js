import api from './api';

export async function loginUser(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function logoutUser() {
  const res = await api.post('/auth/logout');
  return res.data;
}

export async function changePassword(currentPassword, newPassword) {
  const res = await api.put('/auth/change-password', { currentPassword, newPassword });
  return res.data;
}

export async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data;
}
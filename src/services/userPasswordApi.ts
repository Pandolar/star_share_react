import axios from 'axios';

export type PasswordResetRequest = {
  user_id: number;
  mode: 'generated' | 'custom';
  password?: string;
  send_email: boolean;
};
export type PasswordResetResult = {
  user_id: number;
  password: string;
  generated: boolean;
  email_requested: boolean;
  email_sent: boolean;
  email_error?: string;
  sessions_revoked: boolean;
  session_revocation_warning?: string;
};

const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

export async function resetUserPassword(userId: number, request: Omit<PasswordResetRequest, 'user_id'>) {
  let adminToken: string | null = null;
  try { adminToken = localStorage.getItem('admin_token'); } catch { adminToken = null; }
  const response = await client.post<{ code: number; msg?: string; data?: PasswordResetResult }>(
    `/star/users/${userId}/reset-password`,
    { ...request, user_id: userId },
    adminToken ? { headers: { admin_token: adminToken } } : undefined,
  );
  if (response.data.code !== 20000 || !response.data.data) {
    throw new Error(response.data.msg || '密码重置失败');
  }
  return response.data.data;
}

export default resetUserPassword;

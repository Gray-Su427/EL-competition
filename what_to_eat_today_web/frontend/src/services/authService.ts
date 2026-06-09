const API_BASE = '/api/auth';
const TOKEN_KEY = 'auth_token';

export interface AuthUser {
  id: number;
  email: string;
  nickname: string | null;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function sendCode(email: string): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail?.[0]?.msg || err.detail || '发送失败');
  }
  return resp.json();
}

export async function verifyCode(
  email: string,
  code: string
): Promise<{ token: string; needNickname: boolean; nickname: string | null }> {
  const resp = await fetch(`${API_BASE}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || '验证失败');
  }
  const data = await resp.json();
  setToken(data.token);
  return data;
}

export async function setNickname(nickname: string): Promise<AuthUser> {
  const resp = await fetch(`${API_BASE}/set-nickname`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ nickname }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || '设置失败');
  }
  return resp.json();
}

export async function getMe(): Promise<AuthUser> {
  const resp = await fetch(`${API_BASE}/me`, {
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error('未登录');
  }
  return resp.json();
}

export function logout() {
  clearToken();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export { getToken, authHeaders };

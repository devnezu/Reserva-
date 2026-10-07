export interface AuthUser { id: number; name: string; email: string }
export interface AuthSession { user: AuthUser; expiresAt: number }
export const SESSION_EXPIRED_EVENT = 'reservai:session-expired'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'Reservai', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (body.code === 'UNAUTHENTICATED' && path !== '/api/auth/me') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    throw new ApiError(body.message ?? 'Não foi possível concluir a solicitação.', response.status, body.code)
  }
  return response.status === 204 ? undefined as T : response.json()
}

export const authApi = {
  me: () => apiRequest<AuthSession>('/api/auth/me'),
  login: (email: string, password: string) => apiRequest<AuthSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => apiRequest<AuthSession>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => apiRequest<void>('/api/auth/logout', { method: 'POST' }),
}

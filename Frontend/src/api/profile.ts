import { apiRequest, type AuthUser } from './auth'

export const profileApi = {
  uploadAvatar: (file: File) => apiRequest<{ user: AuthUser }>('/api/users/me/avatar', {
    method: 'POST', body: file, headers: { 'Content-Type': file.type },
  }),
}

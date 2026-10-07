import { createContext } from 'react'
import type { AuthUser } from '@/api/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'
export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  expiresAt: number | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)

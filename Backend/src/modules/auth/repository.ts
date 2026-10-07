import { database } from '../../database/connection.js'
import type { Role } from './permissions.js'
import { config } from '../../config/env.js'

export interface UserRow { id: number; name: string; email: string; password_hash: string; avatar_url: string | null; role: Role; demo_account: number }
export interface SessionRow { id: number; name: string; email: string; token_hash: string; expires_at: number; avatar_url: string | null; role: Role }

export const authRepository = {
  findUser(email: string) { return database.prepare('SELECT users.id, name, email, password_hash, role, demo_account, files.secure_url AS avatar_url FROM users LEFT JOIN files ON files.id = users.avatar_file_id WHERE email = ?').get(email) as UserRow | undefined },
  hasAdminGrant(userId: number) { return Boolean(database.prepare('SELECT 1 FROM admin_grants WHERE user_id = ? AND (? = 0 OR source = ?)').get(userId, Number(config.production), 'operator')) },
  createSession(tokenHash: string, userId: number, expiresAt: number) {
    database.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, Date.now(), expiresAt)
  },
  createAccount(name: string, email: string, passwordHash: string, tokenHash: string, expiresAt: number) {
    return database.transaction(() => {
      const result = database.prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING').run(name, email, passwordHash, Date.now())
      if (result.changes === 0) return undefined
      const id = Number(result.lastInsertRowid)
      database.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, id, Date.now(), expiresAt)
      return { id, name, email, avatarUrl: null, role: 'user' as const }
    })()
  },
  getSession(tokenHash: string) {
    return database.prepare("SELECT users.id, users.name, users.email, users.role, sessions.token_hash, sessions.expires_at, files.secure_url AS avatar_url FROM sessions JOIN users ON users.id = sessions.user_id LEFT JOIN files ON files.id = users.avatar_file_id WHERE token_hash = ? AND expires_at > ? AND (? = 0 OR users.demo_account = 0) AND (users.role != 'admin' OR EXISTS (SELECT 1 FROM admin_grants g WHERE g.user_id = users.id AND (? = 0 OR g.source = 'operator')))").get(tokenHash, Date.now(), Number(config.production), Number(config.production)) as SessionRow | undefined
  },
  deleteSession(tokenHash: string) { database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash) },
  cleanup() {
    database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    database.prepare('DELETE FROM auth_attempts WHERE expires_at <= ?').run(Date.now())
  },
}

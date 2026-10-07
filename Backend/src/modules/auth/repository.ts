import { database } from '../../database/connection.js'

export interface UserRow { id: number; name: string; email: string; password_hash: string }
export interface SessionRow { id: number; name: string; email: string; token_hash: string; expires_at: number }

export const authRepository = {
  findUser(email: string) { return database.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email) as UserRow | undefined },
  createSession(tokenHash: string, userId: number, expiresAt: number) {
    database.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, Date.now(), expiresAt)
  },
  getSession(tokenHash: string) {
    return database.prepare('SELECT users.id, users.name, users.email, sessions.token_hash, sessions.expires_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?').get(tokenHash, Date.now()) as SessionRow | undefined
  },
  deleteSession(tokenHash: string) { database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash) },
  cleanup() {
    database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    database.prepare('DELETE FROM auth_attempts WHERE expires_at <= ?').run(Date.now())
  },
}

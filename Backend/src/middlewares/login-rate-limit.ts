import { createHash } from 'node:crypto'
import { database } from '../database/connection.js'
import { HttpError } from './error-handler.js'

export function limitLogin(ip: string, email: string) {
  const now = Date.now()
  database.prepare('DELETE FROM auth_attempts WHERE expires_at <= ?').run(now)
  const keys = [{ key: `ip:${ip}`, limit: 30 }, { key: `email:${createHash('sha256').update(email).digest('hex')}`, limit: 10 }]
  database.transaction(() => {
    for (const { key, limit } of keys) {
      const row = database.prepare('SELECT count FROM auth_attempts WHERE key = ?').get(key) as { count: number } | undefined
      if (row && row.count >= limit) throw new HttpError(429, 'Muitas tentativas. Tente novamente em 15 minutos.', 'RATE_LIMITED')
    }
    for (const { key } of keys) database.prepare('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1').run(key, now + 15 * 60 * 1000)
  })()
}

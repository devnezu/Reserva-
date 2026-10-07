import { randomUUID } from 'node:crypto'
import { database } from '../database/connection.js'
import { HttpError } from '../middlewares/error-handler.js'
import { serverTime } from './server-time.js'

export const processOwner = randomUUID()
export function consumeRate(key: string, limit: number, duration: number, clock = Date.now) {
  database.transaction(() => {
    const now = serverTime(clock)
    database.prepare('DELETE FROM rate_buckets WHERE key = ? AND expires_at <= ?').run(key, now)
    const row = database.prepare('SELECT count FROM rate_buckets WHERE key = ?').get(key) as { count: number } | undefined
    if (row && row.count >= limit) throw new HttpError(429, 'Muitas solicitações. Aguarde um pouco e tente novamente.', 'RATE_LIMITED')
    database.prepare('INSERT INTO rate_buckets VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1').run(key, now + duration)
  }).immediate()
}

export function acquireLease(kind: 'ws' | 'ws-ip' | 'upload', subject: string, totalLimit: number, subjectLimit: number, duration: number, owner = processOwner) {
  return database.transaction(() => {
    const now = serverTime()
    database.prepare('DELETE FROM resource_leases WHERE expires_at <= ?').run(now)
    const total = (database.prepare('SELECT COUNT(*) AS n FROM resource_leases WHERE kind = ?').get(kind) as { n: number }).n
    const own = (database.prepare('SELECT COUNT(*) AS n FROM resource_leases WHERE kind = ? AND subject = ?').get(kind, subject) as { n: number }).n
    if (total >= totalLimit || own >= subjectLimit) throw new HttpError(429, 'Aguarde a operação atual e tente novamente.', 'RESOURCE_LIMIT')
    const id = randomUUID()
    database.prepare('INSERT INTO resource_leases VALUES (?, ?, ?, ?, ?)').run(id, kind, owner, subject, now + duration)
    return id
  }).immediate()
}
export function renewLease(id: string, duration: number) {
  return database.transaction(() => {
    const now = serverTime()
    return database.prepare('UPDATE resource_leases SET expires_at = ? WHERE id = ? AND expires_at > ?').run(now + duration, id, now).changes === 1
  }).immediate()
}
export function releaseLease(id: string) { database.prepare('DELETE FROM resource_leases WHERE id = ?').run(id) }
export function cleanupLimits() {
  const now = serverTime()
  database.prepare('DELETE FROM resource_leases WHERE expires_at <= ?').run(now)
  database.prepare('DELETE FROM rate_buckets WHERE expires_at <= ?').run(now)
}

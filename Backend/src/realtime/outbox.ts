import { database } from '../database/connection.js'

// Call inside the same transaction as the domain change. Each WS connection
// has its own cursor: another server process cannot consume its notifications.
export function enqueueNotification(type: string, data: unknown, userId: number | null, now: number) {
  database.prepare('INSERT INTO realtime_outbox (user_id, type, payload, created_at) VALUES (?, ?, ?, ?)').run(userId, type, JSON.stringify(data), now)
}

export interface OutboxRow { id: number; user_id: number | null; type: string; payload: string; created_at: number }
export function latestNotificationId() {
  return (database.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM realtime_outbox').get() as { id: number }).id
}
export function notificationsAfter(cursor: number, userId?: number) {
  if (userId !== undefined) return database.prepare('SELECT * FROM realtime_outbox WHERE id > ? AND (user_id IS NULL OR user_id = ?) ORDER BY id LIMIT 100').all(cursor, userId) as OutboxRow[]
  return database.prepare('SELECT * FROM realtime_outbox WHERE id > ? ORDER BY id LIMIT 100').all(cursor) as OutboxRow[]
}
export function pruneNotifications(now: number) {
  database.prepare('DELETE FROM realtime_outbox WHERE created_at < ?').run(now - 7 * 86400000)
}

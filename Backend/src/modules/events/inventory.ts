import { database } from '../../database/connection.js'
import { enqueueNotification } from '../../realtime/outbox.js'

// A pending reservation stops occupying capacity at expires_at, independently
// of whether the expiry worker has persisted EXPIRADA yet.
export const occupiedSql = `(SELECT COALESCE(SUM(r.quantity), 0) FROM reservations r
  WHERE r.event_id = events.id AND (r.status = 'CONFIRMADA' OR (r.status = 'PENDENTE' AND r.expires_at > ?)))`

export function inventory(eventId: number, now: number) {
  const row = database.prepare(`SELECT capacity, ${occupiedSql} AS occupied FROM events WHERE id = ?`).get(now, eventId) as { capacity: number; occupied: number } | undefined
  return row ? { capacity: row.capacity, reservedCount: row.occupied, available: row.capacity - row.occupied } : undefined
}

export function notifyInventory(eventId: number, now: number) {
  const stock = inventory(eventId, now)
  if (stock) enqueueNotification('event.availability.updated', { eventId, ...stock, serverTime: now }, null, now)
}

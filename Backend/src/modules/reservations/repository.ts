import { randomUUID } from 'node:crypto'
import { database } from '../../database/connection.js'
import { inventory, notifyInventory } from '../events/inventory.js'
import { enqueueNotification } from '../../realtime/outbox.js'
import { HttpError } from '../../middlewares/error-handler.js'

export type ReservationStatus = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA' | 'EXPIRADA'
interface ReservationRow {
  id: string; user_id: number; event_id: number; quantity: number; status: ReservationStatus;
  unit_price_cents: number; total_cents: number; created_at: number; updated_at: number;
  expires_at: number; confirmed_at: number | null; cancelled_at: number | null; version: number;
  title: string; slug: string; location: string; starts_at: number; banner_url: string | null;
}
const select = `SELECT r.*, e.title, e.slug, e.location, e.starts_at, COALESCE(f.secure_url, e.banner_url) AS banner_url
  FROM reservations r JOIN events e ON e.id = r.event_id LEFT JOIN files f ON f.id = e.banner_file_id`
const find = (id: string, userId: number) => database.prepare(`${select} WHERE r.id = ? AND r.user_id = ?`).get(id, userId) as ReservationRow | undefined
export function reservationDto(row: ReservationRow, now: number) {
  return { id: row.id, eventId: row.event_id, quantity: row.quantity,
    status: row.status === 'PENDENTE' && row.expires_at <= now ? 'EXPIRADA' as const : row.status,
    unitPriceCents: row.unit_price_cents, totalCents: row.total_cents,
    createdAt: row.created_at, updatedAt: row.updated_at, expiresAt: row.expires_at,
    confirmedAt: row.confirmed_at, cancelledAt: row.cancelled_at, version: row.version,
    event: { id: row.event_id, slug: row.slug, title: row.title, location: row.location, startsAt: row.starts_at, bannerUrl: row.banner_url } }
}

function run<T>(work: () => T): T {
  try { return database.transaction(work).immediate() }
  catch (error) {
    if ((error as { code?: string }).code?.startsWith('SQLITE_BUSY')) throw new HttpError(503, 'O serviço está ocupado. Tente novamente em instantes.', 'TEMPORARILY_UNAVAILABLE')
    throw error
  }
}

function updated(row: ReservationRow, now: number) {
  enqueueNotification('reservation.updated', { reservation: reservationDto(row, now), serverTime: now }, row.user_id, now)
}

// Must run inside an IMMEDIATE transaction. Batch expiry shares that transaction
// with its notifications; no timer or client clock participates in correctness.
function expire(now: number, filter: { userId?: number; eventId?: number; id?: string } = {}, limit = 1000) {
  const clauses = ["r.status = 'PENDENTE'", 'r.expires_at <= ?']
  const params: (number | string)[] = [now]
  if (filter.userId !== undefined) { clauses.push('r.user_id = ?'); params.push(filter.userId) }
  if (filter.eventId !== undefined) { clauses.push('r.event_id = ?'); params.push(filter.eventId) }
  if (filter.id !== undefined) { clauses.push('r.id = ?'); params.push(filter.id) }
  const rows = database.prepare(`${select} WHERE ${clauses.join(' AND ')} ORDER BY r.expires_at, r.id LIMIT ?`).all(...params, limit) as ReservationRow[]
  const events = new Set<number>()
  for (const row of rows) {
    database.prepare("UPDATE reservations SET status = 'EXPIRADA', updated_at = ?, version = version + 1 WHERE id = ? AND status = 'PENDENTE'").run(now, row.id)
    updated({ ...row, status: 'EXPIRADA', updated_at: now, version: row.version + 1 }, now)
    events.add(row.event_id)
  }
  for (const id of events) notifyInventory(id, now)
  return rows.length
}

interface RequestRow { event_id: number; quantity: number; reservation_id: string | null; response_status: number; error_code: string | null; error_message: string | null }
interface ResultBody { serverTime: number; requestId: string; reservation?: ReturnType<typeof reservationDto>; code?: string; message?: string }
export interface ReservationResult { status: number; body: ResultBody }
function result(userId: number, requestId: string, now: number, status: number, reservation?: ReservationRow, code?: string, message?: string): ReservationResult {
  const body: ResultBody = { requestId, serverTime: now, ...(reservation ? { reservation: reservationDto(reservation, now) } : {}), ...(code ? { code, message } : {}) }
  enqueueNotification('reservation.result', { ...body, success: status < 400, httpStatus: status }, userId, now)
  return { status, body }
}

export const reservationsRepository = {
  create(userId: number, eventId: number, quantity: number, requestId: string, clock = Date.now) {
    return run(() => {
      const now = clock() // Capture time AFTER acquiring the write lock.
      expire(now, { eventId })
      const previous = database.prepare('SELECT * FROM reservation_requests WHERE user_id = ? AND request_key = ?').get(userId, requestId) as RequestRow | undefined
      if (previous) {
        if (previous.event_id !== eventId || previous.quantity !== quantity) return result(userId, requestId, now, 409, undefined, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa já foi usada com outros dados.')
        return previous.reservation_id
          ? result(userId, requestId, now, 200, find(previous.reservation_id, userId)!)
          : result(userId, requestId, now, previous.response_status, undefined, previous.error_code!, previous.error_message!)
      }
      const event = database.prepare('SELECT * FROM events WHERE id = ? AND published = 1 AND archived_at IS NULL').get(eventId) as { starts_at: number; expires_at: number; unit_price_cents: number } | undefined
      let code: string | undefined, message: string | undefined, status = 201
      if (!event) { status = 404; code = 'EVENT_NOT_FOUND'; message = 'Evento não encontrado.' }
      else if (event.starts_at <= now || event.expires_at <= now) { status = 409; code = 'EVENT_CLOSED'; message = 'O prazo para reservar este evento encerrou.' }
      else if (inventory(eventId, now)!.available < quantity) { status = 409; code = 'INSUFFICIENT_CAPACITY'; message = 'Não há ingressos suficientes para essa quantidade. Outra pessoa pode ter reservado os últimos ingressos.' }
      let reservation: ReservationRow | undefined
      if (status === 201) {
        const id = randomUUID()
        database.prepare("INSERT INTO reservations (id, user_id, event_id, quantity, status, unit_price_cents, total_cents, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, 'PENDENTE', ?, ?, ?, ?, ?)").run(id, userId, eventId, quantity, event!.unit_price_cents, event!.unit_price_cents * quantity, now, now, now + 300000)
        reservation = find(id, userId)!
        notifyInventory(eventId, now)
      }
      database.prepare('INSERT INTO reservation_requests (user_id, request_key, event_id, quantity, reservation_id, response_status, error_code, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(userId, requestId, eventId, quantity, reservation?.id ?? null, status, code ?? null, message ?? null, now)
      return result(userId, requestId, now, status, reservation, code, message)
    })
  },
  get(userId: number, id: string, clock = Date.now) {
    return run(() => {
      const now = clock()
      if (!find(id, userId)) throw new HttpError(404, 'Reserva não encontrada.', 'RESERVATION_NOT_FOUND')
      expire(now, { userId, id })
      return { reservation: reservationDto(find(id, userId)!, now), serverTime: now }
    })
  },
  list(userId: number, page: number, pageSize: number, clock = Date.now) {
    return run(() => {
      const now = clock()
      expire(now, { userId })
      const total = (database.prepare('SELECT COUNT(*) AS total FROM reservations WHERE user_id = ?').get(userId) as { total: number }).total
      const rows = database.prepare(`${select} WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`).all(userId, pageSize, (page - 1) * pageSize) as ReservationRow[]
      return { items: rows.map((row) => reservationDto(row, now)), total, page, pageSize, totalPages: Math.ceil(total / pageSize), serverTime: now }
    })
  },
  transition(userId: number, id: string, action: 'confirm' | 'cancel', requestId: string, clock = Date.now) {
    return run(() => {
      const now = clock()
      if (!find(id, userId)) return result(userId, requestId, now, 404, undefined, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada.')
      expire(now, { userId, id })
      const row = find(id, userId)!
      if (action === 'confirm' && row.status === 'CONFIRMADA') return result(userId, requestId, now, 200, row)
      if (row.status !== 'PENDENTE') return result(userId, requestId, now, 409, undefined,
        row.status === 'EXPIRADA' ? 'RESERVATION_EXPIRED' : 'INVALID_TRANSITION',
        row.status === 'EXPIRADA' ? 'Sua reserva expirou. Faça uma nova reserva se ainda houver ingressos.' : 'Esta reserva já foi finalizada e não permite essa ação.')
      const status = action === 'confirm' ? 'CONFIRMADA' : 'CANCELADA'
      database.prepare(`UPDATE reservations SET status = ?, updated_at = ?, ${action === 'confirm' ? 'confirmed_at' : 'cancelled_at'} = ?, version = version + 1 WHERE id = ? AND status = 'PENDENTE' AND expires_at > ?`).run(status, now, now, id, now)
      const changed = find(id, userId)!
      updated(changed, now)
      notifyInventory(row.event_id, now)
      return result(userId, requestId, now, 200, changed)
    })
  },
  expireDue(clock = Date.now) {
    if (!database.prepare("SELECT 1 FROM reservations WHERE status = 'PENDENTE' AND expires_at <= ? LIMIT 1").get(clock())) return 0
    return run(() => expire(clock()))
  },
}

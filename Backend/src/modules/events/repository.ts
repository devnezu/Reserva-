import { database } from '../../database/connection.js'
import { randomUUID } from 'node:crypto'
import type { EventInput, EventGenre } from './schemas.js'
interface EventRow {
  id: number; slug: string; title: string; genre: EventGenre; location: string; content: string; unit_price_cents: number;
  capacity: number; reserved_count: number; starts_at: number; ends_at: number; expires_at: number;
  banner_url: string | null; published: number; archived_at: number | null;
}
const select = 'SELECT events.*, COALESCE(files.secure_url, events.banner_url) AS banner_url FROM events LEFT JOIN files ON files.id = events.banner_file_id'
export function eventDto(row: EventRow, detail = false) {
  const status = !row.published ? 'draft' : row.expires_at <= Date.now() || row.starts_at <= Date.now() ? 'expired' : row.capacity <= row.reserved_count ? 'sold_out' : 'open'
  return { id: row.id, slug: row.slug, title: row.title, genre: row.genre, location: row.location, unitPriceCents: row.unit_price_cents,
    capacity: row.capacity, reservedCount: row.reserved_count, available: row.capacity - row.reserved_count,
    startsAt: row.starts_at, endsAt: row.ends_at, expiresAt: row.expires_at, bannerUrl: row.banner_url,
    status, ...(detail ? { content: row.content } : {}) }
}
export const eventsRepository = {
  find(id: number) { return database.prepare(`${select} WHERE events.id = ? AND archived_at IS NULL`).get(id) as EventRow | undefined },
  findPublished(reference: string) {
    const field = /^[1-9]\d*$/.test(reference) ? 'events.id' : 'slug'
    return database.prepare(`${select} WHERE ${field} = ? AND archived_at IS NULL AND published = 1`).get(reference) as EventRow | undefined
  },
  list(query: { page: number; pageSize: number; q: string; genre: string }, manage: boolean) {
    const where = ['archived_at IS NULL']
    const params: (string | number)[] = []
    if (!manage) { where.push('published = 1 AND starts_at > ? AND expires_at > ?'); params.push(Date.now(), Date.now()) }
    if (query.q) { where.push("title LIKE ? ESCAPE '\\'"); params.push(`%${query.q.replace(/[\\%_]/g, '\\$&')}%`) }
    if (query.genre) { where.push('genre = ?'); params.push(query.genre) }
    const filter = where.join(' AND ')
    const total = (database.prepare(`SELECT COUNT(*) AS total FROM events WHERE ${filter}`).get(...params) as { total: number }).total
    const rows = database.prepare(`${select} WHERE ${filter} ORDER BY starts_at ASC, events.id ASC LIMIT ? OFFSET ?`).all(...params, query.pageSize, (query.page - 1) * query.pageSize) as EventRow[]
    return { items: rows.map((row) => eventDto(row)), total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  },
  create(input: EventInput, userId: number) {
    return database.transaction(() => {
      const result = database.prepare('INSERT INTO events (slug, title, genre, location, content, unit_price_cents, capacity, starts_at, ends_at, expires_at, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`novo-${randomUUID()}`, input.title, input.genre, input.location, input.content, input.unitPriceCents, input.capacity, input.startsAt, input.endsAt, input.expiresAt, userId, Date.now(), Date.now())
      const id = Number(result.lastInsertRowid)
      const titleSlug = input.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/, '') || 'evento'
      database.prepare('UPDATE events SET slug = ? WHERE id = ?').run(`${titleSlug}-${id}`, id)
      return id
    })()
  },
  update(id: number, input: EventInput) {
    return database.prepare('UPDATE events SET title = ?, genre = ?, location = ?, content = ?, unit_price_cents = ?, capacity = ?, starts_at = ?, ends_at = ?, expires_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL AND reserved_count <= ?').run(input.title, input.genre, input.location, input.content, input.unitPriceCents, input.capacity, input.startsAt, input.endsAt, input.expiresAt, Date.now(), id, input.capacity).changes > 0
  },
  archive(id: number) { database.prepare('UPDATE events SET archived_at = ?, updated_at = ? WHERE id = ?').run(Date.now(), Date.now(), id) },
}

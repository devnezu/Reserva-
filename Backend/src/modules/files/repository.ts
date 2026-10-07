import { randomUUID } from 'node:crypto'
import { database } from '../../database/connection.js'
import { notifyInventory } from '../events/inventory.js'

export const filesRepository = {
  replaceEventBanner(eventId: number, userId: number, publicId: string, url: string, bytes: number, width: number, height: number) {
    database.transaction(() => {
      const previous = database.prepare('SELECT files.id, files.public_id FROM events JOIN files ON files.id = events.banner_file_id WHERE events.id = ?').get(eventId) as { id: string; public_id: string } | undefined
      const id = randomUUID()
      database.prepare('INSERT INTO files (id, user_id, public_id, secure_url, mime_type, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, userId, publicId, url, 'image/webp', bytes, width, height, Date.now())
      database.prepare('UPDATE events SET banner_file_id = ?, banner_url = NULL, published = 1, updated_at = ? WHERE id = ?').run(id, Date.now(), eventId)
      notifyInventory(eventId, Date.now())
      if (previous) {
        database.prepare('INSERT OR IGNORE INTO file_cleanup_jobs (public_id, created_at) VALUES (?, ?)').run(previous.public_id, Date.now())
        database.prepare('DELETE FROM files WHERE id = ?').run(previous.id)
      }
    })()
  },
  replaceAvatar(userId: number, publicId: string, url: string, bytes: number) {
    database.transaction(() => {
      const previous = database.prepare('SELECT files.id, files.public_id FROM users JOIN files ON files.id = users.avatar_file_id WHERE users.id = ?').get(userId) as { id: string; public_id: string } | undefined
      const id = randomUUID()
      database.prepare('INSERT INTO files (id, user_id, public_id, secure_url, mime_type, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, 512, 512, ?)').run(id, userId, publicId, url, 'image/webp', bytes, Date.now())
      database.prepare('UPDATE users SET avatar_file_id = ? WHERE id = ?').run(id, userId)
      if (previous) {
        database.prepare('INSERT OR IGNORE INTO file_cleanup_jobs (public_id, created_at) VALUES (?, ?)').run(previous.public_id, Date.now())
        database.prepare('DELETE FROM files WHERE id = ?').run(previous.id)
      }
    })()
  },
  enqueueCleanup(publicId: string) { database.prepare('INSERT OR IGNORE INTO file_cleanup_jobs (public_id, created_at) VALUES (?, ?)').run(publicId, Date.now()) },
  pendingCleanup() { return database.prepare('SELECT public_id FROM file_cleanup_jobs ORDER BY created_at LIMIT 10').all() as { public_id: string }[] },
  finishCleanup(publicId: string) { database.prepare('DELETE FROM file_cleanup_jobs WHERE public_id = ?').run(publicId) },
}

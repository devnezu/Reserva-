import { database } from './connection.js'
import { authMigration } from './migrations/001-auth.js'
import { filesMigration } from './migrations/002-files.js'
import { eventsMigration } from './migrations/003-events.js'
import { eventContentMigration } from './migrations/004-event-content.js'
import { eventPagesMigration } from './migrations/005-event-pages.js'
import { reservationsMigration } from './migrations/006-reservations.js'

export function migrate() {
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)')
  database.transaction(() => {
    for (const migration of [authMigration, filesMigration, eventsMigration, eventContentMigration, eventPagesMigration, reservationsMigration]) {
      if (database.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(migration.version)) continue
      database.exec(migration.sql)
      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(migration.version, Date.now())
    }
  }).immediate()
}

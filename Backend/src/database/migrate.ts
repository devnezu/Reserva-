import { database } from './connection.js'
import { authMigration } from './migrations/001-auth.js'

export function migrate() {
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)')
  database.transaction(() => {
    for (const migration of [authMigration]) {
      if (database.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(migration.version)) continue
      database.exec(migration.sql)
      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(migration.version, Date.now())
    }
  })()
}

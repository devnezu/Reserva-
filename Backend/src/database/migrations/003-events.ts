export const eventsMigration = {
  version: 3,
  sql: `
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    UPDATE users SET role = 'admin' WHERE email IN ('dry1@reservai.com', 'dry2@reservai.com');
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed_key TEXT UNIQUE,
      title TEXT NOT NULL,
      genre TEXT NOT NULL CHECK (genre IN ('football', 'sport', 'pop', 'music', 'other')),
      location TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL CHECK (typeof(unit_price_cents) = 'integer' AND unit_price_cents >= 0),
      capacity INTEGER NOT NULL CHECK (typeof(capacity) = 'integer' AND capacity > 0),
      reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0 AND reserved_count <= capacity),
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      banner_file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
      banner_url TEXT,
      published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      CHECK (ends_at > starts_at AND expires_at <= starts_at)
    );
    CREATE INDEX events_schedule ON events(starts_at, id);
  `,
}

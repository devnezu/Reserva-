export const filesMigration = {
  version: 2,
  sql: `
    CREATE TABLE files (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_id TEXT NOT NULL UNIQUE,
      secure_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX files_user_id ON files(user_id);
    ALTER TABLE users ADD COLUMN avatar_file_id TEXT REFERENCES files(id) ON DELETE SET NULL;
    CREATE TABLE file_cleanup_jobs (
      public_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
  `,
}

export const eventContentMigration = {
  version: 4,
  sql: `
    ALTER TABLE events ADD COLUMN content TEXT NOT NULL DEFAULT '';
    ALTER TABLE events ADD COLUMN archived_at INTEGER;
    UPDATE users SET role = 'user' WHERE email = 'dry1@reservai.com';
    UPDATE users SET role = 'admin' WHERE email = 'dry2@reservai.com';
  `,
}

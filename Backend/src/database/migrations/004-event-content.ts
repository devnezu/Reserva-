export const eventContentMigration = {
  version: 4,
  sql: `
    ALTER TABLE events ADD COLUMN content TEXT NOT NULL DEFAULT '';
    ALTER TABLE events ADD COLUMN archived_at INTEGER;
  `,
}

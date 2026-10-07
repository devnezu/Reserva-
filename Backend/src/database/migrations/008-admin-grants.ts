export const adminGrantsMigration = {
  version: 8,
  sql: `
    CREATE TABLE admin_grants (user_id INTEGER PRIMARY KEY REFERENCES users(id), source TEXT NOT NULL CHECK (source IN ('demo', 'operator')), created_at INTEGER NOT NULL);
    INSERT INTO admin_grants SELECT id, 'operator', created_at FROM users WHERE role = 'admin' AND email NOT IN ('dry1@reservai.com', 'dry2@reservai.com');
  `,
}

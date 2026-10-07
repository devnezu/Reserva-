export const securityMigration = {
  version: 7,
  sql: `
    ALTER TABLE users ADD COLUMN demo_account INTEGER NOT NULL DEFAULT 0 CHECK (demo_account IN (0, 1));
    CREATE TABLE security_clock (id INTEGER PRIMARY KEY CHECK (id = 1), observed_at INTEGER NOT NULL);
    INSERT INTO security_clock VALUES (1, 0);
    CREATE TABLE resource_leases (id TEXT PRIMARY KEY, kind TEXT NOT NULL, owner TEXT NOT NULL, subject TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX resource_leases_expiry ON resource_leases(kind, expires_at);
    CREATE TABLE rate_buckets (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    ALTER TABLE file_cleanup_jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE file_cleanup_jobs ADD COLUMN next_attempt_at INTEGER NOT NULL DEFAULT 0;
    CREATE INDEX file_cleanup_ready ON file_cleanup_jobs(next_attempt_at, created_at);
  `,
}

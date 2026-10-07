export const reservationsMigration = {
  version: 6,
  sql: `
    CREATE TABLE reservations (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      event_id INTEGER NOT NULL REFERENCES events(id),
      quantity INTEGER NOT NULL CHECK (typeof(quantity) = 'integer' AND quantity BETWEEN 1 AND 4),
      status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA')),
      unit_price_cents INTEGER NOT NULL CHECK (typeof(unit_price_cents) = 'integer' AND unit_price_cents >= 0),
      total_cents INTEGER NOT NULL CHECK (typeof(total_cents) = 'integer' AND total_cents = quantity * unit_price_cents),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL CHECK (expires_at = created_at + 300000),
      confirmed_at INTEGER,
      cancelled_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
    );
    CREATE INDEX reservations_owner ON reservations(user_id, created_at DESC, id DESC);
    CREATE INDEX reservations_inventory ON reservations(event_id, status, expires_at);
    CREATE INDEX reservations_expiry ON reservations(expires_at) WHERE status = 'PENDENTE';
    CREATE TRIGGER reservations_immutable BEFORE UPDATE ON reservations
    WHEN NEW.id != OLD.id OR NEW.user_id != OLD.user_id OR NEW.event_id != OLD.event_id
      OR NEW.quantity != OLD.quantity OR NEW.unit_price_cents != OLD.unit_price_cents
      OR NEW.total_cents != OLD.total_cents OR NEW.created_at != OLD.created_at OR NEW.expires_at != OLD.expires_at
    BEGIN SELECT RAISE(ABORT, 'RESERVATION_IMMUTABLE'); END;
    CREATE TRIGGER reservations_final BEFORE UPDATE OF status ON reservations
    WHEN OLD.status != 'PENDENTE' AND NEW.status != OLD.status
    BEGIN SELECT RAISE(ABORT, 'RESERVATION_FINAL'); END;
    CREATE TABLE reservation_requests (
      user_id INTEGER NOT NULL REFERENCES users(id),
      request_key TEXT NOT NULL,
      event_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      reservation_id TEXT REFERENCES reservations(id),
      response_status INTEGER NOT NULL,
      error_code TEXT,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, request_key)
    );
    CREATE TABLE realtime_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX realtime_outbox_age ON realtime_outbox(created_at);
  `,
}

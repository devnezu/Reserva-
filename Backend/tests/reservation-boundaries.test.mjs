import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'reservai-reservation-boundaries-')), 'app.sqlite')
const { database } = await import('../dist/database/connection.js')
const { migrate } = await import('../dist/database/migrate.js')
const { seed } = await import('../dist/database/seed.js')
const { reservationsRepository: reservations } = await import('../dist/modules/reservations/repository.js')
const { inventory } = await import('../dist/modules/events/inventory.js')
migrate(); await seed()
const event = database.prepare("SELECT id FROM events WHERE seed_key = 'demo-spfc-vitoria'").get().id
const user = database.prepare("SELECT id FROM users WHERE email = 'dry1@reservai.com'").get().id

test('Server clock boundaries and expiry without a worker', async (suite) => {
  suite.after(() => database.close())
  // Independent clock scenarios; production never resets this high-water mark.
  suite.beforeEach(() => database.prepare('UPDATE security_clock SET observed_at = 0').run())
  const now = Date.now()
  const make = (time = now) => reservations.create(user, event, 1, randomUUID(), () => time).body.reservation
  await suite.test('expires exactly at 5 minutes, not a millisecond later; conflicts persist EXPIRADA', () => {
    const valid = make()
    assert.equal(reservations.transition(user, valid.id, 'confirm', randomUUID(), () => valid.expiresAt - 1).body.reservation.status, 'CONFIRMADA')
    for (const action of ['confirm', 'cancel']) {
      const expiring = make()
      const result = reservations.transition(user, expiring.id, action, randomUUID(), () => expiring.expiresAt)
      assert.equal(result.status, 409); assert.equal(result.body.code, 'RESERVATION_EXPIRED')
      assert.equal(database.prepare('SELECT status FROM reservations WHERE id = ?').get(expiring.id).status, 'EXPIRADA')
    }
  })
  await suite.test('expired pending rows immediately stop occupying capacity even without expiry persistence', () => {
    const pending = make(now - 360000)
    assert.equal(database.prepare('SELECT status FROM reservations WHERE id = ?').get(pending.id).status, 'PENDENTE')
    const count = database.prepare("SELECT SUM(quantity) AS count FROM reservations WHERE event_id = ? AND status = 'CONFIRMADA'").get(event).count
    assert.equal(inventory(event, now).reservedCount, count)
    const value = reservations.get(user, pending.id, () => now)
    assert.equal(value.reservation.status, 'EXPIRADA')
    assert.equal(inventory(event, now).reservedCount, count)
  })
  await suite.test('another user reserves the released tickets exactly at expiresAt and after it', () => {
    // Evento do seed com capacidade 2: quem segura os dois ingressos bloqueia qualquer outra reserva.
    const scarce = database.prepare("SELECT id FROM events WHERE seed_key = 'demo-pop'").get().id
    const other = database.prepare("SELECT id FROM users WHERE email = 'dry2@reservai.com'").get().id
    const status = (id) => database.prepare('SELECT status FROM reservations WHERE id = ?').get(id).status
    const held = reservations.create(user, scarce, 2, randomUUID(), () => now).body.reservation
    assert.equal(inventory(scarce, now).available, 0)

    const early = reservations.create(other, scarce, 2, randomUUID(), () => held.expiresAt - 1)
    assert.equal(early.status, 409); assert.equal(early.body.code, 'INSUFFICIENT_CAPACITY')

    const atLimit = reservations.create(other, scarce, 2, randomUUID(), () => held.expiresAt)
    assert.equal(atLimit.status, 201); assert.equal(atLimit.body.reservation.status, 'PENDENTE')
    assert.equal(status(held.id), 'EXPIRADA')
    assert.equal(reservations.get(user, held.id, () => held.expiresAt).reservation.status, 'EXPIRADA')
    const refused = reservations.transition(user, held.id, 'confirm', randomUUID(), () => held.expiresAt)
    assert.equal(refused.status, 409); assert.equal(refused.body.code, 'RESERVATION_EXPIRED')
    assert.equal(inventory(scarce, held.expiresAt).available, 0)

    const later = atLimit.body.reservation.expiresAt + 60000
    const afterLimit = reservations.create(user, scarce, 2, randomUUID(), () => later)
    assert.equal(afterLimit.status, 201)
    assert.equal(status(atLimit.body.reservation.id), 'EXPIRADA')
    const occupied = database.prepare("SELECT COALESCE(SUM(quantity), 0) AS total FROM reservations WHERE event_id = ? AND (status = 'CONFIRMADA' OR (status = 'PENDENTE' AND expires_at > ?))").get(scarce, later).total
    assert.equal(occupied, 2)
    assert.equal(inventory(scarce, later).available, 0)
  })
  await suite.test('an idempotent retry after expiry returns the same expired reservation without a new hold', () => {
    const key = randomUUID()
    const initial = reservations.create(user, event, 1, key, () => now).body.reservation
    const repeated = reservations.create(user, event, 1, key, () => initial.expiresAt)
    assert.equal(repeated.status, 200); assert.equal(repeated.body.reservation.id, initial.id)
    assert.equal(repeated.body.reservation.status, 'EXPIRADA')
    assert.equal(repeated.body.reservation.createdAt, initial.createdAt)
  })
  await suite.test('failure to record a notification rolls back the reservation and its idempotency key', () => {
    const key = randomUUID()
    const before = inventory(event, now).reservedCount
    database.exec("CREATE TRIGGER test_outbox_failure BEFORE INSERT ON realtime_outbox BEGIN SELECT RAISE(ABORT, 'TEST_OUTBOX_FAILURE'); END;")
    try { assert.throws(() => reservations.create(user, event, 1, key, () => now), /TEST_OUTBOX_FAILURE/) }
    finally { database.exec('DROP TRIGGER test_outbox_failure') }
    assert.equal(inventory(event, now).reservedCount, before)
    assert.equal(database.prepare('SELECT COUNT(*) AS total FROM reservation_requests WHERE request_key = ?').get(key).total, 0)
    assert.equal(reservations.create(user, event, 1, key, () => now).status, 201)
  })
})

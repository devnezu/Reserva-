import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'

function runSeed(databasePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['dist/database/seed-cli.js'], {
      env: { ...process.env, DATABASE_PATH: databasePath }, stdio: ['ignore', 'ignore', 'pipe'],
    })
    let output = ''
    child.stderr.on('data', (chunk) => { output += chunk })
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Seed did not finish within 20 seconds')) }, 20000)
    child.once('error', (error) => { clearTimeout(timeout); reject(error) })
    child.once('exit', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve()
      else reject(new Error(`Seed exited with code ${code}: ${output}`))
    })
  })
}

const snapshot = (db) => Object.fromEntries(['users', 'events', 'files', 'sessions', 'reservations', 'schema_migrations'].map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]))

test('Seed can be repeated without duplicating or overwriting existing records', async (suite) => {
  const databasePath = join(mkdtempSync(join(tmpdir(), 'reservai-seed-test-')), 'app.sqlite')
  let db
  suite.after(() => db?.close())

  await suite.test('four independent seed processes on a fresh database create only three users and three events', async () => {
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => runSeed(databasePath)))
    for (const result of results) assert.equal(result.status, 'fulfilled', result.status === 'rejected' ? result.reason.message : undefined)
    db = new Database(databasePath)
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
    const users = db.prepare('SELECT email, role, password_hash FROM users ORDER BY email').all()
    assert.deepEqual(users.map(({ email, role }) => ({ email, role })), [
      { email: 'dry1@reservai.com', role: 'user' }, { email: 'dry2@reservai.com', role: 'admin' },
      { email: 'dry3@reservai.com', role: 'user' },
    ])
    assert.ok(users.every((user) => user.password_hash.startsWith('$argon2id$')))
    const events = db.prepare('SELECT seed_key, capacity, starts_at FROM events ORDER BY seed_key').all()
    assert.deepEqual(events.map((event) => event.seed_key), ['demo-pop', 'demo-spfc-vasco', 'demo-spfc-vitoria'])
    assert.equal(events.find((event) => event.seed_key === 'demo-pop').capacity, 2)
    assert.ok(events.every((event) => event.starts_at > Date.now()))
    const before = snapshot(db)
    for (let i = 0; i < 3; i++) await runSeed(databasePath)
    assert.deepEqual(snapshot(db), before, 'IDs, password hashes, event dates and all existing rows must remain unchanged')
  })

  await suite.test('reruns preserve edited accounts, uploaded images, archived events, sessions, reservations and manually created records', async () => {
    const now = Date.now()
    const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('dry2@reservai.com')
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('dry1@reservai.com')
    const event = db.prepare('SELECT * FROM events WHERE seed_key = ?').get('demo-spfc-vitoria')
    db.prepare("UPDATE users SET name = 'Edited user', role = 'admin', password_hash = ? WHERE id = ?").run(admin.password_hash, user.id)
    db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(admin.id)
    db.prepare('INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('kept-image', user.id, 'test/kept-image', 'https://example.com/kept-image.webp', 'image/webp', 1234, 800, 400, now)
    db.prepare('UPDATE users SET avatar_file_id = ? WHERE id = ?').run('kept-image', user.id)
    db.prepare("UPDATE events SET title = 'Edited event', slug = 'edited-event', content = '', unit_price_cents = 9876, capacity = 123, starts_at = ?, ends_at = ?, expires_at = ?, banner_file_id = ?, banner_url = ?, archived_at = ?, updated_at = ? WHERE id = ?").run(now + 86400000, now + 93600000, now + 82800000, 'kept-image', 'https://example.com/kept-image.webp', now, now, event.id)
    db.prepare('INSERT INTO users (name, email, password_hash, created_at, role) VALUES (?, ?, ?, ?, ?)').run('Registered user', 'registered@example.com', user.password_hash, now, 'user')
    db.prepare("INSERT INTO events (slug, title, genre, location, unit_price_cents, capacity, starts_at, ends_at, expires_at, created_by, created_at, updated_at, content) VALUES ('manual-event', 'Manual event', 'pop', 'Custom venue', 2050, 20, ?, ?, ?, ?, ?, ?, 'Custom content')").run(now + 86400000, now + 93600000, now + 82800000, admin.id, now, now)
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run('test-session-hash', user.id, now, now + 86400000)
    db.prepare("INSERT INTO reservations (id, user_id, event_id, quantity, status, unit_price_cents, total_cents, created_at, updated_at, expires_at, confirmed_at) VALUES ('test-reservation', ?, ?, 2, 'CONFIRMADA', 3450, 6900, ?, ?, ?, ?)").run(user.id, event.id, now, now, now + 300000, now)
    const before = snapshot(db)
    for (let i = 0; i < 3; i++) await runSeed(databasePath)
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => runSeed(databasePath)))
    for (const result of results) assert.equal(result.status, 'fulfilled', result.status === 'rejected' ? result.reason.message : undefined)
    assert.deepEqual(snapshot(db), before)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 4)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM events').get().total, 4)
  })

  await suite.test('a partially populated database gets only the missing seed event, once, without restoring archived records', async () => {
    db.prepare("DELETE FROM events WHERE seed_key = 'demo-pop'").run()
    const beforeUsers = db.prepare('SELECT * FROM users ORDER BY id').all()
    const beforeEvents = db.prepare('SELECT * FROM events ORDER BY id').all()
    await runSeed(databasePath)
    const after = snapshot(db)
    await runSeed(databasePath)
    assert.deepEqual(snapshot(db), after)
    assert.deepEqual(db.prepare('SELECT * FROM users ORDER BY id').all(), beforeUsers)
    for (const event of beforeEvents) assert.deepEqual(db.prepare('SELECT * FROM events WHERE id = ?').get(event.id), event)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM events').get().total, 4)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM events WHERE seed_key IS NOT NULL').get().total, 3)
    assert.equal(db.prepare("SELECT capacity FROM events WHERE seed_key = 'demo-pop'").get().capacity, 2)
    assert.ok(db.prepare("SELECT archived_at FROM events WHERE seed_key = 'demo-spfc-vitoria'").get().archived_at)
  })
})

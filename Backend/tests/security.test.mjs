import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { request as httpRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocket } from 'ws'
import sharp from 'sharp'

const directory = mkdtempSync(join(tmpdir(), 'reservai-security-test-'))
process.env.DATABASE_PATH = join(directory, 'app.sqlite')
const { database: db } = await import('../dist/database/connection.js')
const { migrate } = await import('../dist/database/migrate.js')
const { seed } = await import('../dist/database/seed.js')
const { reservationsRepository: reservations, pruneReservationRequests } = await import('../dist/modules/reservations/repository.js')
const { eventsRepository } = await import('../dist/modules/events/repository.js')
const { inventory } = await import('../dist/modules/events/inventory.js')
const { serverTime } = await import('../dist/lib/server-time.js')
const { filesRepository } = await import('../dist/modules/files/repository.js')
const { acquireLease, releaseLease, consumeRate } = await import('../dist/lib/resource-limits.js')
const { config } = await import('../dist/config/env.js')
const { clientAddress } = await import('../dist/lib/client-address.js')
const { authMigration } = await import('../dist/database/migrations/001-auth.js')
const { filesMigration } = await import('../dist/database/migrations/002-files.js')
const { eventsMigration } = await import('../dist/database/migrations/003-events.js')
const { eventContentMigration } = await import('../dist/database/migrations/004-event-content.js')
import Database from 'better-sqlite3'
migrate(); await seed()
const origin = 'http://localhost:5173', control = join(directory, 'control.json'), log = join(directory, 'uploads.jsonl')
const controls = (value) => writeFileSync(control, JSON.stringify(value))
const operations = () => existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
controls({})
const userId = db.prepare("SELECT id FROM users WHERE email='dry1@reservai.com'").get().id
const adminId = db.prepare("SELECT id FROM users WHERE email='dry2@reservai.com'").get().id
async function until(check) { for (let i = 0; i < 200; i++) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 20)) } throw new Error('Timed out') }
async function start(extra = {}) {
  const probe = createServer(); await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise((resolve) => probe.close(resolve))
  const child = spawn(process.execPath, ['--import', './tests/helpers/cloudinary-mock.mjs', 'dist/server.js'], { env: { ...process.env, PORT: String(port), APP_ORIGINS: origin, SEED_ON_START: 'false', CLOUDINARY_URL: '', CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_APIKEY: 'key', CLOUDINARY_APISECRET: 'secret', CLOUDINARY_TEST_CONTROL: control, CLOUDINARY_TEST_LOG: log, ...extra }, stdio: ['ignore', 'ignore', 'pipe'] })
  let output = ''; child.stderr.on('data', (bytes) => { output += bytes })
  const url = `http://127.0.0.1:${port}`
  await until(async () => { if (child.exitCode !== null) throw new Error(output); try { return (await fetch(url + '/api/hello')).ok } catch { return false } })
  return { child, url, port }
}
async function stop(server) { if (server.child.exitCode === null) { const done = new Promise((resolve) => server.child.once('exit', resolve)); server.child.kill(); await done } }
const request = (server, path, method = 'GET', body, cookie, headers = {}) => fetch(server.url + path, { method, headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
async function login(server, admin = false) { const result = await request(server, '/api/auth/login', 'POST', { email: admin ? 'dry2@reservai.com' : 'dry1@reservai.com', password: admin ? 'dryedemais321' : 'dryedemais123' }); assert.equal(result.status, 200); return result.headers.get('set-cookie').split(';')[0] }
const eventInput = (changes = {}) => { const now = Date.now(); return { title: 'Security ' + randomUUID(), genre: 'pop', location: 'Test venue', content: '', unitPriceCents: 1000, capacity: 20, startsAt: now + 86400000, endsAt: now + 93600000, expiresAt: now + 82800000, ...changes } }
function makeEvent(changes = {}) { const input = eventInput(changes), id = eventsRepository.create(input, adminId); return { id, input } }
async function slow(server, path, method, body, cookie, revoke) {
  const payload = JSON.stringify(body)
  let settle; const response = new Promise((resolve, reject) => { settle = { resolve, reject } })
  const sending = httpRequest(server.url + path, { method, headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'application/json', Cookie: cookie, 'Content-Length': Buffer.byteLength(payload) } }, (received) => { received.resume(); received.once('end', () => settle.resolve(received.statusCode)) })
  sending.on('error', settle.reject); sending.write(payload.slice(0, 1)); await new Promise((resolve) => setTimeout(resolve, 80)); await revoke(); sending.end(payload.slice(1)); return response
}
async function connect(server, cookie) {
  const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`, { origin, headers: { Cookie: cookie } }), messages = []
  socket.on('message', (bytes) => messages.push(JSON.parse(bytes.toString())))
  socket.on('error', () => {})
  return new Promise((resolve) => { socket.once('open', () => resolve({ socket, messages, status: 101 })); socket.once('unexpected-response', (_, response) => { response.resume(); socket.terminate(); resolve({ socket, messages, status: response.statusCode }) }) })
}

test('Security regressions and shared resource protections', async (suite) => {
  const first = await start(), second = await start(), sockets = []
  suite.after(async () => { sockets.forEach((socket) => socket.terminate()); await stop(first); await stop(second); db.close() })
  suite.beforeEach(() => { db.prepare('DELETE FROM rate_buckets').run(); db.prepare('UPDATE security_clock SET observed_at=0').run(); controls({}) })

  await suite.test('POST after logout and PATCH after demotion cannot write events', async () => {
    const cookie = await login(first, true), before = db.prepare('SELECT COUNT(*) n FROM events').get().n
    assert.equal(await slow(first, '/api/events', 'POST', eventInput(), cookie, async () => { assert.equal((await request(second, '/api/auth/logout', 'POST', undefined, cookie)).status, 204) }), 401)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM events').get().n, before)
    const expiring = await login(first, true)
    assert.equal(await slow(first, '/api/events', 'POST', eventInput(), expiring, async () => db.prepare('UPDATE sessions SET expires_at=? WHERE user_id=?').run(Date.now() - 1000, adminId)), 401)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM events').get().n, before)
    const next = await login(first, true), event = makeEvent()
    try {
      assert.equal(await slow(first, `/api/events/${event.id}`, 'PATCH', { ...event.input, title: 'Forbidden title' }, next, async () => db.prepare("UPDATE users SET role='user' WHERE id=?").run(adminId)), 403)
      assert.equal(db.prepare('SELECT title FROM events WHERE id=?').get(event.id).title, event.input.title)
    } finally { db.prepare("UPDATE users SET role='admin' WHERE id=?").run(adminId) }
  })

  await suite.test('reservation rate limit is shared across processes and rejected keys have bounded retention', async () => {
    const cookie = await login(first), before = db.prepare('SELECT COUNT(*) n FROM reservation_requests').get().n
    for (let i = 0; i < 60; i++) assert.equal((await request(i % 2 ? first : second, '/api/reservations', 'POST', { eventId: 999999, quantity: 1 }, cookie, { 'Idempotency-Key': randomUUID() })).status, 404)
    assert.equal((await request(second, '/api/reservations', 'POST', { eventId: 999999, quantity: 1 }, cookie, { 'Idempotency-Key': randomUUID() })).status, 429)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM reservation_requests').get().n - before, 60)
    const event = makeEvent(); db.prepare('UPDATE events SET published=1 WHERE id=?').run(event.id)
    const valid = reservations.create(userId, event.id, 1, randomUUID()).body.reservation
    db.prepare('UPDATE reservation_requests SET created_at=? WHERE reservation_id IS NULL').run(Date.now() - 8 * 86400000)
    pruneReservationRequests()
    assert.equal(db.prepare('SELECT COUNT(*) n FROM reservation_requests WHERE reservation_id IS NULL').get().n, 0)
    assert.ok(db.prepare('SELECT 1 FROM reservation_requests WHERE reservation_id=?').get(valid.id))
  })

  await suite.test('daily new-intent budget, pending quota and successful idempotent recovery remain consistent', () => {
    const event = makeEvent({ capacity: 100 }); db.prepare('UPDATE events SET published=1 WHERE id=?').run(event.id)
    const keys = []
    for (let i = 0; i < 4; i++) { keys.push(randomUUID()); assert.equal(reservations.create(userId, event.id, 1, keys[i]).status, 201) }
    assert.equal(reservations.create(userId, event.id, 1, randomUUID()).body.code, 'PENDING_LIMIT')
    db.prepare('INSERT OR REPLACE INTO rate_buckets VALUES (?,1000,?)').run(`reservation:intents:${userId}`, Date.now() + 86400000)
    assert.throws(() => reservations.create(userId, event.id, 1, randomUUID()), (error) => error.status === 429)
    assert.equal(reservations.create(userId, event.id, 1, keys[0]).status, 200)
  })

  await suite.test('WS connections are bounded across instances and a second resume closes the connection', async () => {
    const cookie = await login(first)
    const open = []
    for (let i = 0; i < 3; i++) { const connection = await connect(i % 2 ? second : first, cookie); assert.equal(connection.status, 101); sockets.push(connection.socket); open.push(connection) }
    assert.equal((await connect(second, cookie)).status, 429)
    const closed = new Promise((resolve) => open[0].socket.once('close', resolve))
    open[0].socket.send(JSON.stringify({ type: 'resume', after: 0 })); open[0].socket.send(JSON.stringify({ type: 'resume', after: 0 }))
    assert.equal(await closed, 1008)
    open.forEach(({ socket }) => socket.terminate())
    await until(() => db.prepare("SELECT COUNT(*) n FROM resource_leases WHERE kind='ws'").get().n === 0)
  })

  await suite.test('normal users cannot receive current or historical draft metadata over WS', async () => {
    const cookie = await login(first), event = makeEvent(), connection = await connect(second, cookie); sockets.push(connection.socket)
    eventsRepository.update(event.id, { ...event.input, capacity: 321 })
    db.prepare('INSERT INTO realtime_outbox(user_id,type,payload,created_at) VALUES(NULL,?,?,?)').run('event.availability.updated', JSON.stringify({ eventId: event.id, capacity: 999 }), Date.now())
    connection.socket.send(JSON.stringify({ type: 'resume', after: 0 }))
    await until(() => connection.messages.some((message) => message.type === 'realtime.cursor'))
    assert.ok(!connection.messages.some((message) => message.type === 'event.availability.updated' && message.data.eventId === event.id))
    connection.socket.terminate()
  })

  await suite.test('capacity reduction persists expiry; rollback of the clock cannot resurrect or confirm that hold', () => {
    const event = makeEvent({ capacity: 2 }); db.prepare('UPDATE events SET published=1 WHERE id=?').run(event.id)
    const now = Date.now(), held = reservations.create(userId, event.id, 2, randomUUID(), () => now).body.reservation, original = Date.now
    try { Date.now = () => held.expiresAt; assert.equal(eventsRepository.update(event.id, { ...event.input, capacity: 1 }), true) } finally { Date.now = original }
    assert.equal(db.prepare('SELECT status FROM reservations WHERE id=?').get(held.id).status, 'EXPIRADA')
    assert.equal(inventory(event.id, now).available, 1)
    assert.equal(reservations.transition(userId, held.id, 'confirm', randomUUID(), () => now).status, 409)
    assert.equal(reservations.create(adminId, event.id, 1, randomUUID(), () => now).status, 201)
    assert.equal(inventory(event.id, now).available, 0)
  })

  await suite.test('bad credentials never lock a correct password and only trusted proxies can supply client IPs', async () => {
    for (let i = 0; i < 10; i++) assert.equal((await request(first, '/api/auth/login', 'POST', { email: 'dry1@reservai.com', password: 'wrong' })).status, 401)
    assert.equal((await request(first, '/api/auth/login', 'POST', { email: 'dry1@reservai.com', password: 'wrong' })).status, 429)
    assert.ok(await login(first))
    const req = { socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.5' } }
    assert.equal(clientAddress(req), '127.0.0.1')
    config.trustedProxies.add('127.0.0.1')
    try { assert.equal(clientAddress(req), '198.51.100.5') } finally { config.trustedProxies.delete('127.0.0.1') }
  })

  await suite.test('server time keeps advancing while the wall clock is backwards and survives a new process', async () => {
    const original = Date.now
    const at = db.transaction(() => serverTime()).immediate()
    try {
      Date.now = () => at - 3600000
      await new Promise((resolve) => setTimeout(resolve, 40))
      const advanced = db.transaction(() => serverTime()).immediate()
      assert.ok(advanced >= at + 20)
      const probe = spawn(process.execPath, ['--input-type=module', '-e', `Date.now = () => ${at - 3600000}; const { serverTime } = await import('./dist/lib/server-time.js'); console.log(serverTime())`], { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''; probe.stdout.on('data', (chunk) => { output += chunk })
      assert.equal(await new Promise((resolve) => probe.once('exit', resolve)), 0)
      assert.ok(Number(output.trim()) >= advanced)
    } finally { Date.now = original }
  })

  await suite.test('demo sessions/accounts are denied in production and email-only legacy upgrades do not grant admin', async () => {
    const cookie = await login(first, true), production = await start({ NODE_ENV: 'production' })
    try { assert.equal((await request(production, '/api/auth/me', 'GET', undefined, cookie)).status, 401); assert.equal((await request(production, '/api/auth/login', 'POST', { email: 'dry2@reservai.com', password: 'dryedemais321' })).status, 401) } finally { await stop(production) }
    const cli = spawn(process.execPath, ['dist/database/seed-cli.js'], { env: { ...process.env, NODE_ENV: 'production', APP_ORIGINS: origin, SEED_ON_START: 'false' }, stdio: 'ignore' })
    assert.notEqual(await new Promise((resolve) => cli.once('exit', resolve)), 0)
    const legacy = new Database(join(directory, 'legacy.sqlite'))
    try { legacy.exec(authMigration.sql); legacy.exec(filesMigration.sql); legacy.prepare('INSERT INTO users(name,email,password_hash,created_at) VALUES(?,?,?,?)').run('Unverified', 'dry2@reservai.com', 'controlled hash', Date.now()); legacy.exec(eventsMigration.sql); legacy.exec(eventContentMigration.sql); assert.equal(legacy.prepare('SELECT role FROM users').get().role, 'user') } finally { legacy.close() }
  })

  await suite.test('an already elevated unverified legacy account needs an explicit operator grant', async () => {
    const { hashPassword } = await import('../dist/modules/auth/password.js')
    const { authRepository } = await import('../dist/modules/auth/repository.js')
    const unknown = db.prepare("INSERT INTO users(name,email,password_hash,created_at,role) VALUES('Legacy claimant','claimed@example.invalid',?,?,'admin')").run(await hashPassword('legacy-test123'), Date.now()).lastInsertRowid
    assert.equal(authRepository.hasAdminGrant(Number(unknown)), false)
    assert.equal((await request(first, '/api/auth/login', 'POST', { email: 'claimed@example.invalid', password: 'legacy-test123' })).status, 401)
    const cli = spawn(process.execPath, ['dist/database/admin-cli.js', 'claimed@example.invalid'], { env: { ...process.env }, stdio: 'ignore' })
    assert.equal(await new Promise((resolve) => cli.once('exit', resolve)), 0)
    assert.equal(authRepository.hasAdminGrant(Number(unknown)), true)
    const allowed = await request(first, '/api/auth/login', 'POST', { email: 'claimed@example.invalid', password: 'legacy-test123' })
    assert.equal(allowed.status, 200)
    assert.equal((await allowed.json()).user.role, 'admin')
  })

  await suite.test('upload leases are shared by avatars and banners and enforce an aggregate budget', async () => {
    const cookie = await login(first, true), event = makeEvent(), lease = acquireLease('upload', String(adminId), 2, 1, 120000, 'different-process')
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#ED1C24' } }).png().toBuffer()
    try {
      for (const path of ['/api/users/me/avatar', `/api/events/${event.id}/banner`]) assert.equal((await fetch(second.url + path, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'image/png' }, body: png })).status, 429)
      const other = acquireLease('upload', 'different-user', 2, 1, 120000)
      try { assert.throws(() => acquireLease('upload', 'third-user', 2, 1, 120000), (error) => error.status === 429) } finally { releaseLease(other) }
    } finally { releaseLease(lease) }
  })

  await suite.test('archive during provider upload rejects publication and cleans only the uncommitted asset', async () => {
    const cookie = await login(first, true), event = makeEvent(), before = operations().length
    controls({ delayUploadMs: 150 })
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#ED1C24' } }).png().toBuffer()
    const upload = fetch(first.url + `/api/events/${event.id}/banner`, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'image/png' }, body: png })
    await until(() => operations().length > before)
    assert.equal((await request(second, `/api/events/${event.id}`, 'DELETE', undefined, cookie)).status, 204)
    assert.equal((await upload).status, 404)
    assert.equal(db.prepare('SELECT banner_file_id FROM events WHERE id=?').get(event.id).banner_file_id, null)
    const uploaded = operations().slice(before).find((op) => op.action === 'upload')
    await until(() => operations().some((op) => op.action === 'remove' && op.publicId === uploaded.publicId))
  })

  await suite.test('cleanup errors do not reject; backoff lets later removable jobs run', async () => {
    const { cloudinaryStorage } = await import('../dist/storage/cloudinary.js')
    const { cleanupFiles } = await import('../dist/modules/files/service.js')
    const configured = cloudinaryStorage.configured, remove = cloudinaryStorage.remove, pending = filesRepository.pendingCleanup, errorLog = console.error
    cloudinaryStorage.configured = () => true
    const attempts = []; cloudinaryStorage.remove = async (id) => { attempts.push(id); return id === 'job-10' }
    try {
      for (let i = 0; i < 11; i++) db.prepare('INSERT INTO file_cleanup_jobs(public_id,created_at) VALUES(?,?)').run(`job-${String(i).padStart(2, '0')}`, i)
      await cleanupFiles(); await cleanupFiles()
      assert.ok(attempts.includes('job-10'))
      assert.equal(db.prepare("SELECT COUNT(*) n FROM file_cleanup_jobs WHERE public_id='job-10'").get().n, 0)
      assert.ok(db.prepare("SELECT attempts,next_attempt_at FROM file_cleanup_jobs WHERE public_id='job-00'").get().next_attempt_at > Date.now())
      filesRepository.pendingCleanup = () => { throw new Error('Injected storage failure') }; console.error = () => {}
      await assert.doesNotReject(cleanupFiles())
    } finally { cloudinaryStorage.configured = configured; cloudinaryStorage.remove = remove; filesRepository.pendingCleanup = pending; console.error = errorLog }
  })

  await suite.test('atomic limiter cannot exceed its budget', () => {
    for (let i = 0; i < 3; i++) consumeRate('atomic-test', 3, 60000)
    assert.throws(() => consumeRate('atomic-test', 3, 60000), (error) => error.status === 429)
    assert.equal(db.prepare("SELECT count FROM rate_buckets WHERE key='atomic-test'").get().count, 3)
  })
})

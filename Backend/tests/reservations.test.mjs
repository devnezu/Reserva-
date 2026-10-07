import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import Database from 'better-sqlite3'
import { WebSocket } from 'ws'

const directory = mkdtempSync(join(tmpdir(), 'reservai-reservations-test-'))
const databasePath = join(directory, 'app.sqlite')
const origin = 'http://localhost:5173'
async function until(check, message = 'Timed out') {
  for (let i = 0; i < 200; i++) { if (check()) return; await new Promise((resolve) => setTimeout(resolve, 20)) }
  throw new Error(message)
}
async function start(seed = false) {
  const probe = createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  const child = spawn(process.execPath, ['dist/server.js'], { env: { ...process.env, DATABASE_PATH: databasePath, PORT: String(port), HOST: '127.0.0.1', APP_ORIGINS: origin, SEED_ON_START: String(seed) }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stderr.on('data', (chunk) => { output += chunk })
  const url = `http://127.0.0.1:${port}`
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw new Error(output)
    try { if ((await fetch(url + '/api/hello')).ok) return { child, url, port } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 30))
  }
  child.kill(); throw new Error('Server did not start: ' + output)
}
async function stop(server) {
  if (server.child.exitCode !== null) return
  const exited = new Promise((resolve) => server.child.once('exit', resolve))
  server.child.kill(); await exited
}
async function connect(server, cookie) {
  const messages = []
  const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`, { origin, headers: { Cookie: cookie } })
  socket.on('message', (bytes) => messages.push(JSON.parse(bytes.toString())))
  await until(() => messages.some((item) => item.type === 'realtime.ready'), 'WS did not connect')
  return { socket, messages, cursor: messages.find((item) => item.type === 'realtime.ready').cursor }
}

test('Reservations: real SQLite contention, transitions, ownership and durable WebSocket results', async (suite) => {
  let first = await start(true)
  const second = await start()
  const db = new Database(databasePath)
  db.pragma('busy_timeout = 5000')
  const sockets = []
  suite.after(async () => { sockets.forEach((socket) => socket.terminate()); await stop(first); await stop(second); db.close() })
  const request = (server, path, method = 'GET', body, cookie, headers = {}) => fetch(server.url + path, {
    method, headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body),
  })
  const login = async (email, password) => {
    const response = await request(first, '/api/auth/login', 'POST', { email, password })
    assert.equal(response.status, 200)
    return { cookie: response.headers.get('set-cookie').split(';')[0], user: (await response.json()).user }
  }
  const a = await login('dry1@reservai.com', 'dryedemais123')
  const b = await login('dry2@reservai.com', 'dryedemais321')
  const wa = await connect(first, a.cookie), wb = await connect(second, b.cookie)
  sockets.push(wa.socket, wb.socket)
  const base = { title: 'Evento de reservas', genre: 'pop', location: 'Espaço de testes', content: 'Teste', unitPriceCents: 3450, capacity: 10, startsAt: Date.now() + 86400000, endsAt: Date.now() + 93600000, expiresAt: Date.now() + 82800000 }
  const event = async (changes = {}) => {
    const response = await request(first, '/api/events', 'POST', { ...base, ...changes }, b.cookie)
    assert.equal(response.status, 201)
    const created = (await response.json()).event
    db.prepare("UPDATE events SET published = 1, banner_url = '/events/pop.svg' WHERE id = ?").run(created.id)
    return created
  }
  const reserve = (server, owner, id, quantity, key = randomUUID()) => request(server, '/api/reservations', 'POST', { eventId: id, quantity }, owner.cookie, { 'Idempotency-Key': key })
  const change = (server, owner, id, action) => request(server, `/api/reservations/${id}/${action}`, 'POST', undefined, owner.cookie, { 'X-Request-Id': randomUUID() })
  const stock = async (id) => (await (await request(first, `/api/events/public/${id}`)).json()).event
  const get = (owner, id) => request(first, `/api/reservations/${id}`, 'GET', undefined, owner.cookie)

  await suite.test('authentication, CSRF, quantity, identifiers and pagination are validated before reserving', async () => {
    const e = await event()
    assert.equal((await request(first, '/api/reservations')).status, 401)
    assert.equal((await request(first, '/api/reservations', 'POST', { eventId: e.id, quantity: 1 })).status, 401)
    assert.equal((await request(first, '/api/reservations', 'POST', { eventId: e.id, quantity: 1 }, a.cookie, { Origin: 'https://foreign.example', 'Idempotency-Key': randomUUID() })).status, 403)
    assert.equal((await request(first, '/api/reservations', 'POST', { eventId: e.id, quantity: 1 }, a.cookie)).status, 400)
    for (const quantity of [0, 5, -1, 1.5, '2', null, true]) {
      const response = await reserve(first, a, e.id, quantity)
      assert.equal(response.status, 400, String(quantity)); assert.equal((await response.json()).code, 'INVALID_QUANTITY')
    }
    for (const query of ['?page=0', '?page=1.5', '?pageSize=51', '?pageSize=-1']) assert.equal((await request(first, '/api/reservations' + query, 'GET', undefined, a.cookie)).status, 400)
    assert.equal((await stock(e.id)).available, 10)
  })

  await suite.test('two processes dispute the last two tickets: one wins, the other receives a private WS refusal', async () => {
    const e = await event({ capacity: 2 })
    const ka = randomUUID(), kb = randomUUID()
    const responses = await Promise.all([reserve(first, a, e.id, 2, ka), reserve(second, b, e.id, 2, kb)])
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409])
    const bodies = await Promise.all(responses.map((response) => response.json()))
    const winner = responses.findIndex((response) => response.status === 201)
    assert.equal(bodies[1 - winner].code, 'INSUFFICIENT_CAPACITY')
    assert.equal(bodies[1 - winner].reservation, undefined)
    await until(() => wa.messages.some((message) => message.type === 'reservation.result' && message.data.requestId === ka) && wb.messages.some((message) => message.type === 'reservation.result' && message.data.requestId === kb), 'Private WS results missing')
    for (const [connection, key, expected] of [[wa, ka, winner === 0], [wb, kb, winner === 1]]) {
      const outcome = connection.messages.find((message) => message.type === 'reservation.result' && message.data.requestId === key)
      assert.equal(outcome.data.success, expected)
      assert.ok(!connection.messages.some((message) => message.type === 'reservation.result' && message.data.requestId === (key === ka ? kb : ka)))
      await until(() => connection.messages.some((message) => message.type === 'event.availability.updated' && message.data.eventId === e.id && message.data.available === 0))
    }
    assert.equal((await stock(e.id)).reservedCount, 2)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM reservations WHERE event_id = ?').get(e.id).total, 1)
  })

  await suite.test('two one-ticket reservations fit, but a third reservation cannot oversell', async () => {
    const e = await event({ capacity: 2 })
    const responses = await Promise.all([reserve(first, a, e.id, 1), reserve(second, b, e.id, 1)])
    assert.deepEqual(responses.map((response) => response.status), [201, 201])
    assert.equal((await reserve(first, a, e.id, 1)).status, 409)
    assert.equal((await stock(e.id)).available, 0)
  })

  await suite.test('a burst of forty requests from two processes cannot exceed the capacity', async () => {
    const e = await event({ capacity: 7 })
    const responses = await Promise.all(Array.from({ length: 40 }, (_, i) => reserve(i % 2 ? second : first, i % 2 ? b : a, e.id, 1)))
    assert.equal(responses.filter((response) => response.status === 201).length, 7)
    assert.equal(responses.filter((response) => response.status === 409).length, 33)
    assert.equal((await stock(e.id)).available, 0)
    assert.equal(db.prepare('SELECT SUM(quantity) AS total FROM reservations WHERE event_id = ?').get(e.id).total, 7)
  })

  await suite.test('concurrent retries with the same key create exactly one reservation; changed parameters conflict', async () => {
    const e = await event()
    const key = randomUUID()
    const responses = await Promise.all([reserve(first, a, e.id, 4, key), reserve(second, a, e.id, 4, key)])
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201])
    const [one, two] = await Promise.all(responses.map((response) => response.json()))
    assert.equal(one.reservation.id, two.reservation.id)
    assert.deepEqual(one.reservation, two.reservation)
    assert.equal(one.reservation.expiresAt - one.reservation.createdAt, 300000)
    assert.equal(one.reservation.unitPriceCents, 3450); assert.equal(one.reservation.totalCents, 13800)
    const rejected = await reserve(first, a, e.id, 1, key)
    assert.equal(rejected.status, 409); assert.equal((await rejected.json()).code, 'IDEMPOTENCY_CONFLICT')
    assert.equal((await stock(e.id)).reservedCount, 4)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM reservations WHERE event_id = ?').get(e.id).total, 1)
    assert.equal(db.prepare('SELECT typeof(total_cents) AS type FROM reservations WHERE id = ?').get(one.reservation.id).type, 'integer')
  })

  await suite.test('confirmation is idempotent, keeps stock unchanged and preserves prices after admin edits', async () => {
    const e = await event()
    const { reservation } = await (await reserve(first, a, e.id, 2)).json()
    assert.equal((await request(first, `/api/events/${e.id}`, 'PATCH', { ...base, capacity: 1 }, b.cookie)).status, 409)
    assert.equal((await request(first, `/api/events/${e.id}`, 'PATCH', { ...base, unitPriceCents: 2000 }, b.cookie)).status, 200)
    const firstResponse = await change(first, a, reservation.id, 'confirm')
    assert.equal(firstResponse.status, 200)
    const confirmed = (await firstResponse.json()).reservation
    assert.equal(confirmed.status, 'CONFIRMADA'); assert.equal(confirmed.totalCents, 6900)
    const repeated = await change(second, a, reservation.id, 'confirm')
    assert.equal(repeated.status, 200); assert.deepEqual((await repeated.json()).reservation, confirmed)
    assert.equal((await stock(e.id)).reservedCount, 2)
    assert.equal((await change(first, a, reservation.id, 'cancel')).status, 409)
    assert.throws(() => db.prepare("UPDATE reservations SET status = 'PENDENTE' WHERE id = ?").run(reservation.id), /RESERVATION_FINAL/)
    assert.throws(() => db.prepare('UPDATE reservations SET quantity = 1, total_cents = unit_price_cents WHERE id = ?').run(reservation.id), /RESERVATION_IMMUTABLE/)
  })

  await suite.test('cancellation releases stock once, notifies both buyers and cannot be repeated or confirmed', async () => {
    const e = await event({ capacity: 2 })
    const { reservation } = await (await reserve(first, a, e.id, 2)).json()
    assert.equal((await change(first, a, reservation.id, 'cancel')).status, 200)
    assert.equal((await change(second, a, reservation.id, 'cancel')).status, 409)
    assert.equal((await change(first, a, reservation.id, 'confirm')).status, 409)
    assert.equal((await stock(e.id)).available, 2)
    for (const connection of [wa, wb]) await until(() => connection.messages.some((message) => message.type === 'event.availability.updated' && message.data.eventId === e.id && message.data.available === 2))
    assert.equal((await reserve(second, b, e.id, 2)).status, 201)
  })

  await suite.test('confirm and cancel racing through different processes produce exactly one final transition', async () => {
    const e = await event({ capacity: 2 })
    const { reservation } = await (await reserve(first, a, e.id, 2)).json()
    const responses = await Promise.all([change(first, a, reservation.id, 'confirm'), change(second, a, reservation.id, 'cancel')])
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409])
    const current = (await (await get(a, reservation.id)).json()).reservation
    assert.ok(['CONFIRMADA', 'CANCELADA'].includes(current.status))
    assert.equal((await stock(e.id)).available, current.status === 'CONFIRMADA' ? 0 : 2)
    assert.equal(current.version, 2)
  })

  await suite.test('owners only: even an admin gets identical 404s for foreign and missing reservations', async () => {
    const e = await event()
    const { reservation } = await (await reserve(first, a, e.id, 1)).json()
    for (const id of [reservation.id, randomUUID()]) {
      for (const action of [null, 'confirm', 'cancel']) {
        const response = action ? await change(second, b, id, action) : await get(b, id)
        assert.equal(response.status, 404)
        const body = await response.json()
        assert.equal(body.code, 'RESERVATION_NOT_FOUND'); assert.equal(body.reservation, undefined)
        assert.ok(!JSON.stringify(body).includes(a.user.email))
      }
    }
    const page = await (await request(first, `/api/reservations?pageSize=50&userId=${a.user.id}`, 'GET', undefined, b.cookie)).json()
    const ownIds = db.prepare('SELECT id FROM reservations WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(b.user.id).map((row) => row.id)
    assert.deepEqual(page.items.map((row) => row.id), ownIds)
    assert.ok(!page.items.some((row) => row.id === reservation.id))
  })

  await suite.test('draft, archived, started and booking-deadline events reject new reservations', async () => {
    for (const kind of ['draft', 'archived', 'started', 'deadline']) {
      const e = await event()
      if (kind === 'draft') db.prepare('UPDATE events SET published = 0 WHERE id = ?').run(e.id)
      if (kind === 'archived') await request(first, `/api/events/${e.id}`, 'DELETE', undefined, b.cookie)
      if (kind === 'started') db.prepare('UPDATE events SET starts_at = ?, expires_at = ? WHERE id = ?').run(Date.now() - 60000, Date.now() - 120000, e.id)
      if (kind === 'deadline') db.prepare('UPDATE events SET expires_at = ? WHERE id = ?').run(Date.now() - 60000, e.id)
      assert.equal((await reserve(first, a, e.id, 1)).status, ['draft', 'archived'].includes(kind) ? 404 : 409)
      assert.equal(db.prepare('SELECT COUNT(*) AS total FROM reservations WHERE event_id = ?').get(e.id).total, 0)
    }
  })

  await suite.test('WS reconnect replays missed committed results across a server restart, without leaking another owner', async () => {
    const e = await event()
    const cursor = db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM realtime_outbox').get().id
    const key = randomUUID()
    const response = await reserve(first, a, e.id, 1, key)
    assert.equal(response.status, 201)
    const { reservation } = await response.json()
    const otherKey = randomUUID()
    await reserve(second, b, e.id, 1, otherKey)
    await stop(first); first = await start()
    const reconnected = await connect(first, a.cookie)
    sockets.push(reconnected.socket)
    reconnected.socket.send(JSON.stringify({ type: 'resume', after: cursor }))
    await until(() => reconnected.messages.some((message) => message.type === 'reservation.result' && message.data.requestId === key))
    assert.ok(!reconnected.messages.some((message) => message.type === 'reservation.result' && message.data.requestId === otherKey))
    assert.equal((await (await get(a, reservation.id)).json()).reservation.id, reservation.id)
    const replay = await reserve(first, a, e.id, 1, key)
    assert.equal(replay.status, 200); assert.equal((await replay.json()).reservation.id, reservation.id)
  })
})

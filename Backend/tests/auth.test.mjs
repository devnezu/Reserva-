import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import Database from 'better-sqlite3'
import { verify } from 'argon2'
import { WebSocket } from 'ws'

const origin = 'http://localhost:5173'
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'reservai-auth-test-'))
const databasePath = join(temporaryDirectory, 'app.sqlite')

async function freePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function startServer(env = {}) {
  const port = await freePort()
  const process = spawn(globalThis.process.execPath, ['dist/server.js'], { env: { ...globalThis.process.env, PORT: String(port), DATABASE_PATH: databasePath, APP_ORIGINS: origin, SEED_ON_START: 'true', ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  process.stderr.on('data', (chunk) => { output += chunk })
  for (let attempt = 0; attempt < 100; attempt++) {
    if (process.exitCode !== null) throw new Error(output)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/hello`)
      if (response.ok) return { process, port, url: `http://127.0.0.1:${port}` }
    } catch { /* Server may still be seeding. */ }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  process.kill()
  throw new Error(`Server failed to start: ${output}`)
}

async function stopServer(server) {
  if (server.process.exitCode !== null) return
  const stopped = new Promise((resolve) => server.process.once('exit', resolve))
  server.process.kill()
  await stopped
}

test('SQLite authentication and session lifecycle', async (suite) => {
  let server = await startServer()
  const db = new Database(databasePath)
  suite.after(async () => { db.close(); await stopServer(server) })
  const post = (path, body, cookie, headers = {}) => fetch(server.url + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Requested-With': 'Reservai', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
  const me = (cookie) => fetch(server.url + '/api/auth/me', { headers: cookie ? { Cookie: cookie } : {} })
  const signIn = async (email = 'dry1@reservai.com', password = 'dryedemais123', cookie) => {
    const response = await post('/api/auth/login', { email, password }, cookie)
    assert.equal(response.status, 200)
    return { cookie: response.headers.get('set-cookie').split(';')[0], response, body: await response.json() }
  }

  await suite.test('seed creates exactly two users with Argon2id hashes and reruns safely', async () => {
    const users = db.prepare('SELECT * FROM users ORDER BY email').all()
    assert.equal(users.length, 2)
    assert.deepEqual(users.map((user) => user.name), ['Rafael', 'Gustavo'])
    assert.ok(users.every((user) => user.password_hash.startsWith('$argon2id$')))
    assert.ok(await verify(users[0].password_hash, 'dryedemais123'))
    assert.ok(await verify(users[1].password_hash, 'dryedemais321'))
    await stopServer(server)
    server = await startServer()
    assert.deepEqual(db.prepare('SELECT * FROM users ORDER BY email').all(), users)
  })

  await suite.test('anonymous requests are denied; login validates credentials without exposing secrets', async () => {
    const anonymous = await me()
    assert.equal(anonymous.status, 401)
    assert.equal(anonymous.headers.get('set-cookie'), null, 'A stale session check must not erase a newer cookie')
    const invalid = await post('/api/auth/login', { email: 'dry1@reservai.com', password: 'wrong' })
    const unknown = await post('/api/auth/login', { email: 'unknown@reservai.com', password: 'wrong' })
    assert.equal(invalid.status, 401)
    assert.equal(unknown.status, 401)
    assert.deepEqual(await invalid.json(), await unknown.json())
    assert.equal((await post('/api/auth/login', { email: 'invalid', password: 'wrong' })).status, 400)
    const session = await signIn(' DRY1@RESERVAI.COM ')
    assert.deepEqual(session.body.user, { id: 1, name: 'Rafael', email: 'dry1@reservai.com', avatarUrl: null, role: 'user' })
    assert.ok(!JSON.stringify(session.body).includes('password'))
    assert.match(session.response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/)
    assert.equal(session.response.headers.get('cache-control'), 'no-store')
    const stored = db.prepare('SELECT token_hash FROM sessions ORDER BY created_at DESC LIMIT 1').get()
    assert.notEqual(stored.token_hash, session.cookie.split('=')[1])
    assert.equal((await me(session.cookie)).status, 200)
  })

  await suite.test('CSRF, malformed JSON and oversized bodies are rejected', async () => {
    assert.equal((await post('/api/auth/login', {}, undefined, { Origin: 'https://untrusted.example' })).status, 403)
    assert.equal((await post('/api/auth/logout', undefined, undefined, { 'X-Requested-With': '' })).status, 403)
    const malformed = await fetch(server.url + '/api/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Requested-With': 'Reservai' }, body: '{' })
    assert.equal(malformed.status, 400)
    assert.equal((await post('/api/auth/login', { email: 'dry1@reservai.com', password: 'a'.repeat(5000) })).status, 413)
  })

  await suite.test('session survives server restart, rotates at login and expires', async () => {
    const old = await signIn('dry2@reservai.com', 'dryedemais321')
    await stopServer(server)
    server = await startServer()
    assert.equal((await me(old.cookie)).status, 200)
    const current = await signIn('dry2@reservai.com', 'dryedemais321', old.cookie)
    assert.equal((await me(old.cookie)).status, 401)
    assert.equal((await me(current.cookie)).status, 200)
    // Avoid depending on millisecond clock agreement between separate processes.
    db.prepare('UPDATE sessions SET expires_at = ?').run(Date.now() - 60000)
    assert.equal((await me(current.cookie)).status, 401)
  })

  await suite.test('WebSocket requires a session and closes when logout revokes it', async () => {
    const denied = new WebSocket(`ws://127.0.0.1:${server.port}/ws`, { origin })
    const status = await new Promise((resolve, reject) => {
      denied.on('unexpected-response', (_, response) => { response.resume(); denied.terminate(); resolve(response.statusCode) })
      denied.on('error', () => {})
      denied.on('open', () => { denied.close(); reject(new Error('Anonymous WS accepted')) })
    })
    assert.equal(status, 401)
    const session = await signIn()
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`, { origin, headers: { Cookie: session.cookie } })
    await new Promise((resolve, reject) => { socket.once('message', resolve); socket.once('error', reject) })
    const closed = new Promise((resolve) => socket.once('close', resolve))
    const response = await post('/api/auth/logout', undefined, session.cookie)
    assert.equal(response.status, 204)
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/)
    assert.equal(await closed, 1008)
    assert.equal((await me(session.cookie)).status, 401)
    assert.equal((await post('/api/auth/logout')).status, 204)
  })

  await suite.test('too many login attempts are limited', async () => {
    db.prepare('DELETE FROM auth_attempts').run()
    for (let index = 0; index < 10; index++) assert.equal((await post('/api/auth/login', { email: 'limited@reservai.com', password: 'wrong' })).status, 401)
    assert.equal((await post('/api/auth/login', { email: 'limited@reservai.com', password: 'wrong' })).status, 429)
  })

  await suite.test('production cookies require HTTPS', async () => {
    const production = await startServer({ NODE_ENV: 'production', SEED_ON_START: 'false' })
    try {
      const response = await fetch(production.url + '/api/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Requested-With': 'Reservai' }, body: JSON.stringify({ email: 'dry2@reservai.com', password: 'dryedemais321' }) })
      assert.equal(response.status, 200)
      assert.match(response.headers.get('set-cookie'), /; Secure/)
    } finally { await stopServer(production) }
  })

  await suite.test('registration validates input and trusted origins before creating accounts', async () => {
    const before = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
    const body = { name: 'Ana Silva', email: 'ana@reservai.com', password: 'newpassword123' }
    assert.equal((await post('/api/auth/register', body, undefined, { Origin: 'https://untrusted.example' })).status, 403)
    assert.equal((await post('/api/auth/register', body, undefined, { 'X-Requested-With': '' })).status, 403)
    for (const invalid of [null, [], { ...body, name: ' ' }, { ...body, name: 'a'.repeat(101) }, { ...body, name: 'Ana\nSilva' }, { ...body, email: 'invalid' }, { ...body, password: 'short' }, { ...body, password: 'a'.repeat(129) }]) {
      assert.equal((await post('/api/auth/register', invalid)).status, 400)
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, before)
  })

  await suite.test('registration hashes the password, starts a session and persists the account', async () => {
    const previous = await signIn()
    const response = await post('/api/auth/register', { name: '  Ana Silva  ', email: ' ANA@RESERVAI.COM ', password: 'newpassword123' }, previous.cookie)
    assert.equal(response.status, 201)
    const body = await response.json()
    const cookie = response.headers.get('set-cookie').split(';')[0]
    assert.deepEqual(Object.keys(body).sort(), ['expiresAt', 'user'])
    assert.deepEqual(body.user, { id: body.user.id, name: 'Ana Silva', email: 'ana@reservai.com', avatarUrl: null, role: 'user' })
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/)
    assert.equal((await me(previous.cookie)).status, 401)
    assert.deepEqual((await (await me(cookie)).json()).user, body.user)
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('ana@reservai.com')
    assert.match(user.password_hash, /^\$argon2id\$/)
    assert.ok(await verify(user.password_hash, 'newpassword123'))
    await stopServer(server)
    server = await startServer()
    assert.equal((await me(cookie)).status, 200)
    await post('/api/auth/logout', undefined, cookie)
    assert.equal((await me(cookie)).status, 401)
    assert.equal((await signIn('ana@reservai.com', 'newpassword123')).body.user.id, user.id)
  })

  await suite.test('duplicate and concurrent registrations never overwrite an existing account', async () => {
    const session = await signIn()
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get('dry1@reservai.com')
    const duplicate = await post('/api/auth/register', { name: 'Replacement', email: 'DRY1@RESERVAI.COM', password: 'replacement123' }, session.cookie)
    assert.equal(duplicate.status, 409)
    assert.equal((await duplicate.json()).code, 'EMAIL_IN_USE')
    assert.equal(duplicate.headers.get('set-cookie'), null)
    assert.deepEqual(db.prepare('SELECT * FROM users WHERE email = ?').get('dry1@reservai.com'), existing)
    assert.equal((await me(session.cookie)).status, 200)
    const body = { name: 'Concurrent User', email: 'concurrent@reservai.com', password: 'concurrent123' }
    const responses = await Promise.all([post('/api/auth/register', body), post('/api/auth/register', body)])
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409])
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users WHERE email = ?').get(body.email).count, 1)
  })

  await suite.test('registration attempts are limited independently from login', async () => {
    db.prepare('DELETE FROM auth_attempts').run()
    const body = { name: 'Duplicate', email: 'dry1@reservai.com', password: 'duplicate123' }
    for (let index = 0; index < 10; index++) assert.equal((await post('/api/auth/register', body)).status, 409)
    assert.equal((await post('/api/auth/register', body)).status, 429)
    assert.equal((await signIn()).body.user.name, 'Rafael')
  })
})

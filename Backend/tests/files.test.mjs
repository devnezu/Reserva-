import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomFillSync } from 'node:crypto'
import { createServer, request as httpRequest } from 'node:http'
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { authMigration } from '../dist/database/migrations/001-auth.js'
import { hashPassword } from '../dist/modules/auth/password.js'

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'reservai-files-test-'))
const databasePath = join(temporaryDirectory, 'app.sqlite')
const controlPath = join(temporaryDirectory, 'control.json')
const logPath = join(temporaryDirectory, 'cloudinary.jsonl')
const origin = 'http://localhost:5173'
const controls = (value) => writeFileSync(controlPath, JSON.stringify(value))
const operations = () => existsSync(logPath) ? readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
async function waitFor(check) { for (let i = 0; i < 100; i++) { if (check()) return; await new Promise((resolve) => setTimeout(resolve, 20)) } throw new Error('Timed out waiting for cleanup') }

async function startServer(extra = {}) {
  const probe = createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  const child = spawn(process.execPath, ['--import', './tests/helpers/cloudinary-mock.mjs', 'dist/server.js'], {
    env: { ...process.env, NODE_ENV: 'development', PORT: String(port), DATABASE_PATH: databasePath, APP_ORIGINS: origin, SEED_ON_START: 'true', CLOUDINARY_URL: '', CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_APIKEY: 'test-key', CLOUDINARY_APISECRET: 'test-secret', CLOUDINARY_TEST_CONTROL: controlPath, CLOUDINARY_TEST_LOG: logPath, ...extra }, stdio: 'ignore',
  })
  const url = `http://127.0.0.1:${port}`
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Test server stopped unexpectedly')
    try { if ((await fetch(url + '/api/hello')).ok) return { child, url } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  child.kill()
  throw new Error('Test server failed to start')
}
async function stopServer(server) {
  if (server.child.exitCode !== null) return
  const stopped = new Promise((resolve) => server.child.once('exit', resolve))
  server.child.kill()
  await stopped
}

test('Authenticated profile photos and file lifecycle', async (suite) => {
  // Upgrade a populated v1 database rather than testing only empty databases.
  const legacy = new Database(databasePath)
  legacy.exec(authMigration.sql)
  legacy.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)')
  legacy.prepare('INSERT INTO schema_migrations VALUES (1, ?)').run(Date.now())
  const passwordHash = await hashPassword('dryedemais123')
  legacy.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (1, ?, ?, ?, ?)').run('Rafael', 'dry1@reservai.com', passwordHash, Date.now())
  legacy.close()
  let server = await startServer()
  const db = new Database(databasePath)
  suite.after(async () => { await stopServer(server); db.close() })
  const jsonPost = (path, body, cookie) => fetch(server.url + path, { method: 'POST', headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const signIn = async (email = 'dry1@reservai.com', password = 'dryedemais123') => { const response = await jsonPost('/api/auth/login', { email, password }); assert.equal(response.status, 200); return response.headers.get('set-cookie').split(';')[0] }
  const me = async (cookie) => { const response = await fetch(server.url + '/api/auth/me', { headers: { Cookie: cookie } }); assert.equal(response.status, 200); return response.json() }
  const upload = (body, cookie, headers = {}) => fetch(server.url + '/api/users/me/avatar', { method: 'POST', headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'image/png', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body })
  const png = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#ED1C24' } }).png().toBuffer()
  let cookie = await signIn()

  await suite.test('migration preserves accounts and upload requires authentication and trusted requests', async () => {
    assert.equal(db.prepare('SELECT password_hash FROM users WHERE id = 1').get().password_hash, passwordHash)
    assert.deepEqual(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version), [1, 2, 3, 4])
    assert.equal((await me(cookie)).user.avatarUrl, null)
    assert.equal((await upload(png)).status, 401)
    assert.equal((await upload(png, cookie, { Origin: 'https://untrusted.example' })).status, 403)
    assert.equal((await upload(png, cookie, { 'X-Requested-With': '' })).status, 403)
    assert.equal(operations().length, 0)
  })

  await suite.test('rejects forged types, broken images, empty files and oversized bodies', async () => {
    assert.equal((await upload('<svg/>', cookie, { 'Content-Type': 'image/svg+xml' })).status, 415)
    assert.equal((await upload('not an image', cookie)).status, 400)
    assert.equal((await upload(png, cookie, { 'Content-Type': 'image/jpeg' })).status, 415)
    assert.equal((await upload(Buffer.alloc(0), cookie)).status, 400)
    assert.equal((await upload(Buffer.alloc(25 * 1024 * 1024 + 1), cookie)).status, 413)
    const chunkedStatus = await new Promise((resolve, reject) => {
      const request = httpRequest(server.url + '/api/users/me/avatar', { method: 'POST', headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'image/png', Cookie: cookie } }, (response) => { response.resume(); resolve(response.statusCode) })
      request.on('error', reject)
      request.write(Buffer.alloc(13 * 1024 * 1024))
      request.end(Buffer.alloc(13 * 1024 * 1024))
    })
    assert.equal(chunkedStatus, 413)
    assert.equal(operations().length, 0)
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM files').get().count, 0)
    db.prepare('DELETE FROM auth_attempts WHERE key LIKE ?').run('avatar:%')
  })

  await suite.test('stores a processed avatar and restores it after restart and login', async () => {
    const largePhoto = await sharp(randomFillSync(Buffer.alloc(1600 * 1600 * 3)), { raw: { width: 1600, height: 1600, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer()
    assert.ok(largePhoto.length > 5 * 1024 * 1024 && largePhoto.length < 25 * 1024 * 1024)
    const response = await upload(largePhoto, cookie)
    assert.equal(response.status, 200)
    const { user } = await response.json()
    assert.match(user.avatarUrl, /^https:\/\//)
    assert.equal((await me(cookie)).user.avatarUrl, user.avatarUrl)
    const stored = db.prepare('SELECT * FROM files').get()
    assert.equal(stored.user_id, 1)
    assert.equal(stored.secure_url, user.avatarUrl)
    assert.equal(stored.mime_type, 'image/webp')
    assert.deepEqual(operations().find((row) => row.action === 'upload'), { action: 'upload', publicId: stored.public_id, format: 'webp', width: 512, height: 512, exif: false, bytes: stored.bytes })
    await stopServer(server)
    server = await startServer()
    assert.equal((await me(cookie)).user.avatarUrl, user.avatarUrl)
    cookie = await signIn()
    assert.equal((await me(cookie)).user.avatarUrl, user.avatarUrl)
    const gustavo = await signIn('dry2@reservai.com', 'dryedemais321')
    assert.equal((await me(gustavo)).user.avatarUrl, null)
  })

  await suite.test('replacement cleans only the previous owned photo, with durable retries', async () => {
    const previous = db.prepare('SELECT * FROM files').get()
    controls({ failRemove: true })
    assert.equal((await upload(png, cookie)).status, 200)
    const current = db.prepare('SELECT * FROM files').get()
    assert.notEqual(current.id, previous.id)
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM files').get().count, 1)
    await waitFor(() => operations().some((row) => row.action === 'remove' && row.publicId === previous.public_id))
    assert.ok(db.prepare('SELECT * FROM file_cleanup_jobs WHERE public_id = ?').get(previous.public_id))
    controls({})
    await stopServer(server)
    server = await startServer()
    await waitFor(() => db.prepare('SELECT COUNT(*) AS count FROM file_cleanup_jobs').get().count === 0)
    assert.equal((await me(cookie)).user.avatarUrl, current.secure_url)
  })

  await suite.test('accepts high-resolution JPEG photos while distinguishing pixel limits from invalid files', async () => {
    for (const [width, height] of [[6000, 4000], [8000, 6000]]) {
      const jpeg = await sharp({ create: { width, height, channels: 3, background: '#ED1C24' } }).jpeg().toBuffer()
      assert.ok(width * height > 20_000_000 && jpeg.length < 25 * 1024 * 1024)
      assert.equal((await upload(jpeg, cookie, { 'Content-Type': 'image/jpeg' })).status, 200)
    }
    const forged = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ED1C24' } }).jpeg({ progressive: false }).toBuffer()
    const frame = forged.indexOf(Buffer.from([0xff, 0xc0]))
    assert.ok(frame >= 0)
    forged.writeUInt16BE(10001, frame + 5)
    forged.writeUInt16BE(10001, frame + 7)
    const tooManyPixels = await upload(forged, cookie, { 'Content-Type': 'image/jpeg' })
    assert.equal(tooManyPixels.status, 413)
    assert.equal((await tooManyPixels.json()).code, 'IMAGE_RESOLUTION_TOO_LARGE')
    const invalid = await upload('broken image', cookie, { 'Content-Type': 'image/jpeg' })
    assert.equal(invalid.status, 400)
    assert.equal((await invalid.json()).code, 'INVALID_IMAGE')
    db.prepare('DELETE FROM auth_attempts WHERE key LIKE ?').run('avatar:%')
  })

  await suite.test('provider failure keeps the current photo and hides provider details', async () => {
    const previous = (await me(cookie)).user.avatarUrl
    controls({ failUpload: true })
    const response = await upload(png, cookie)
    assert.equal(response.status, 502)
    assert.equal((await response.json()).code, 'UPLOAD_FAILED')
    assert.equal((await me(cookie)).user.avatarUrl, previous)
    controls({})
  })

  await suite.test('logout during an upload prevents the profile update and concurrent requests are bounded', async () => {
    const before = db.prepare('SELECT avatar_file_id FROM users WHERE id = 1').get().avatar_file_id
    const count = operations().filter((row) => row.action === 'upload').length
    controls({ delayUploadMs: 200 })
    const pending = upload(png, cookie)
    await waitFor(() => operations().filter((row) => row.action === 'upload').length > count)
    assert.equal((await upload(png, cookie)).status, 429)
    assert.equal((await jsonPost('/api/auth/logout', undefined, cookie)).status, 204)
    assert.equal((await pending).status, 401)
    assert.equal(db.prepare('SELECT avatar_file_id FROM users WHERE id = 1').get().avatar_file_id, before)
    controls({})
    cookie = await signIn()
  })

  await suite.test('upload rate limits and missing configuration return clear errors', async () => {
    db.prepare('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 10, ?) ON CONFLICT(key) DO UPDATE SET count = 10, expires_at = excluded.expires_at').run('avatar:1', Date.now() + 60000)
    assert.equal((await upload(png, cookie)).status, 429)
    await stopServer(server)
    server = await startServer({ CLOUDINARY_CLOUD_NAME: '' })
    const response = await upload(png, cookie)
    assert.equal(response.status, 503)
    assert.equal((await response.json()).code, 'UPLOAD_NOT_CONFIGURED')
  })
})

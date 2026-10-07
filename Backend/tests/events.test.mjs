import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'

const directory = mkdtempSync(join(tmpdir(), 'reservai-events-test-'))
const databasePath = join(directory, 'app.sqlite')
const controlPath = join(directory, 'control.json')
const logPath = join(directory, 'uploads.jsonl')
const origin = 'http://localhost:5173'
const controls = (value) => writeFileSync(controlPath, JSON.stringify(value))
const operations = () => existsSync(logPath) ? readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
async function waitFor(check) { for (let i = 0; i < 150; i++) { if (check()) return; await new Promise((resolve) => setTimeout(resolve, 20)) } throw new Error('Timed out') }
async function start() {
  const probe = createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  const child = spawn(process.execPath, ['--import', './tests/helpers/cloudinary-mock.mjs', 'dist/server.js'], { env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath, APP_ORIGINS: origin, SEED_ON_START: 'true', CLOUDINARY_URL: '', CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_APIKEY: 'key', CLOUDINARY_APISECRET: 'secret', CLOUDINARY_TEST_CONTROL: controlPath, CLOUDINARY_TEST_LOG: logPath }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stderr.on('data', (chunk) => { output += chunk })
  const url = `http://127.0.0.1:${port}`
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output)
    try { if ((await fetch(url + '/api/hello')).ok) return { child, url } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  child.kill()
  throw new Error('Could not start server')
}
async function stop(server) { if (server.child.exitCode === null) { const exited = new Promise((resolve) => server.child.once('exit', resolve)); server.child.kill(); await exited } }

test('Dynamic events, money, RBAC and banners', async (suite) => {
  let server = await start()
  const db = new Database(databasePath)
  suite.after(async () => { await stop(server); db.close() })
  const request = (path, method = 'GET', body, cookie, extra = {}) => fetch(server.url + path, { method, headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) })
  const login = async (email, password) => { const response = await request('/api/auth/login', 'POST', { email, password }); assert.equal(response.status, 200); return { cookie: response.headers.get('set-cookie').split(';')[0], user: (await response.json()).user } }
  const admin = await login('dry2@reservai.com', 'dryedemais321')
  const user = await login('dry1@reservai.com', 'dryedemais123')
  const list = async (query = '', manage = false) => { const response = await request(`/api/events${manage ? '/manage' : ''}${query}`, 'GET', undefined, manage ? admin.cookie : undefined); assert.equal(response.status, 200); return response.json() }
  const base = { title: 'Evento Pop de Teste', genre: 'pop', location: 'Espaço de testes', content: 'COMPRE INGRESSO COM DESCONTO\nVERMELHO\n50% de desconto\n<script>alert(1)</script>', unitPriceCents: 3450, capacity: 2, startsAt: Date.now() + 5 * 86400000, endsAt: Date.now() + 5 * 86400000 + 7200000, expiresAt: Date.now() + 5 * 86400000 - 3600000 }
  const create = async (data = base) => { const response = await request('/api/events', 'POST', data, admin.cookie); assert.equal(response.status, 201); return (await response.json()).event }
  const get = async (id, cookie = admin.cookie) => { const response = await request(`/api/events/${id}`, 'GET', undefined, cookie); assert.equal(response.status, 200); return (await response.json()).event }
  const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#ED1C24' } }).png().toBuffer()
  const banner = (id, cookie = admin.cookie, body = png, headers = {}) => fetch(server.url + `/api/events/${id}/banner`, { method: 'POST', headers: { Origin: origin, 'X-Requested-With': 'Reservai', 'Content-Type': 'image/png', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body })
  let event

  await suite.test('seed creates three future events with integer cents and a capacity of two; reruns preserve edits', async () => {
    assert.equal(admin.user.role, 'admin')
    assert.equal(user.user.role, 'user')
    const page = await list()
    assert.equal(page.total, 3)
    assert.equal(page.items[0].unitPriceCents, 3450)
    assert.equal(page.items[0].slug, 'spfc-vitoria')
    const publicEvent = await request('/api/events/public/spfc-vitoria')
    assert.equal(publicEvent.status, 200)
    assert.match((await publicEvent.json()).event.content, /O Tricolor recebe o Vitória/)
    assert.equal(page.items.find((item) => item.genre === 'pop').available, 2)
    assert.ok(page.items.every((item) => item.startsAt > Date.now() && !('content' in item)))
    db.prepare('UPDATE events SET title = ? WHERE id = ?').run('Título preservado', page.items[0].id)
    await stop(server); server = await start()
    assert.equal((await list()).total, 3)
    assert.equal((await get(page.items[0].id)).title, 'Título preservado')
  })
  await suite.test('RBAC denies anonymous and user writes, cannot self-promote at registration, and checks roles on every request', async () => {
    for (const cookie of [undefined, user.cookie]) {
      const expected = cookie ? 403 : 401
      assert.equal((await request('/api/events/manage', 'GET', undefined, cookie)).status, expected)
      assert.equal((await request('/api/events', 'POST', base, cookie)).status, expected)
      assert.equal((await request('/api/events/1', 'PATCH', base, cookie)).status, expected)
      assert.equal((await request('/api/events/1', 'DELETE', undefined, cookie)).status, expected)
      assert.equal((await banner(1, cookie ?? null)).status, expected)
    }
    const registered = await request('/api/auth/register', 'POST', { name: 'Normal User', email: 'normal@reservai.com', password: 'normal12345', role: 'admin' })
    assert.equal(registered.status, 201)
    assert.equal((await registered.json()).user.role, 'user')
    db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(admin.user.id)
    assert.equal((await request('/api/events', 'POST', base, admin.cookie)).status, 403)
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.user.id)
    assert.equal((await request('/api/events', 'POST', base, admin.cookie, { Origin: 'https://untrusted.example' })).status, 403)
    assert.equal((await request('/api/events/1')).status, 401)
  })
  await suite.test('rejects fractional cents, invalid capacities, categories, content and inconsistent dates', async () => {
    for (const change of [{ unitPriceCents: 34.5 }, { unitPriceCents: '3450' }, { unitPriceCents: -1 }, { capacity: 1.5 }, { capacity: 0 }, { genre: 'invalid' }, { content: {} }, { content: 'a'.repeat(20001) }, { endsAt: base.startsAt }, { expiresAt: base.startsAt + 1 }, { startsAt: '2026-10-10' }, { expiresAt: Date.now() - 60000 }]) {
      assert.equal((await request('/api/events', 'POST', { ...base, ...change }, admin.cookie)).status, 400, JSON.stringify(change).slice(0, 100))
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM events').get().total, 3)
  })
  await suite.test('draft preserves multiline plain content, hidden from users and catalog; upload publishes a sanitized banner', async () => {
    event = await create()
    assert.match(event.slug, /^evento-pop-de-teste-\d+$/)
    assert.equal(event.status, 'draft')
    assert.equal(event.content, base.content)
    assert.equal((await list()).total, 3)
    assert.equal((await request(`/api/events/${event.id}`, 'GET', undefined, user.cookie)).status, 404)
    assert.equal((await request(`/api/events/public/${event.slug}`)).status, 404)
    assert.equal((await banner(event.id, admin.cookie, 'broken')).status, 400)
    assert.equal((await banner(event.id, admin.cookie, png, { 'Content-Type': 'image/jpeg' })).status, 415)
    const response = await banner(event.id)
    assert.equal(response.status, 200)
    event = (await response.json()).event
    assert.equal(event.status, 'open')
    assert.match(event.bannerUrl, /^https:\/\//)
    assert.equal((await get(event.id, user.cookie)).content, base.content)
    for (const reference of [event.slug, event.id]) {
      const published = await request(`/api/events/public/${reference}`)
      assert.equal(published.status, 200)
      assert.equal((await published.json()).event.content, base.content)
    }
    assert.equal((await request('/api/events/public/does-not-exist')).status, 404)
    assert.equal((await request('/api/events/public/Invalid%20Address')).status, 400)
    const upload = operations().find((op) => op.action === 'upload')
    assert.equal(upload.format, 'webp')
    assert.equal(upload.width, 1920)
    assert.equal(upload.height, 960)
    assert.equal(upload.exif, false)
    assert.equal((await list()).total, 4)
    assert.ok((await list()).items.every((item) => !('content' in item)))
  })
  await suite.test('search, genre filters and pagination are ordered by date and ID; money round-trips exactly', async () => {
    const twin = await create({ ...base, title: 'Evento 100%_especial', unitPriceCents: 1000 })
    assert.equal((await banner(twin.id)).status, 200)
    const first = await list('?pageSize=2&page=1')
    const second = await list('?pageSize=2&page=2')
    const all = await list('?pageSize=50')
    assert.deepEqual([...first.items, ...second.items].map((row) => row.id), all.items.slice(0, 4).map((row) => row.id))
    assert.ok(all.items.findIndex((item) => item.id === event.id) < all.items.findIndex((item) => item.id === twin.id))
    assert.equal((await list('?q=100%25_')).total, 1)
    const accented = await create({ ...base, title: 'Noite da Vitória' })
    for (const term of ['Vitória', 'vitoria', 'VITORIA', 'vit', 'oria', 'VITÓRIA']) {
      assert.deepEqual((await list(`?q=${encodeURIComponent(term)}`, true)).items.map((row) => row.id), [accented.id], term)
    }
    assert.equal((await request(`/api/events/${accented.id}`, 'DELETE', undefined, admin.cookie)).status, 204)
    assert.equal((await list('?genre=football')).total, 2)
    for (const query of ['?page=0', '?pageSize=51', '?page=1.5', '?genre=nope']) assert.equal((await request('/api/events' + query)).status, 400)
    for (const cents of [1000, 2000, 3450]) {
      const update = await request(`/api/events/${event.id}`, 'PATCH', { ...base, unitPriceCents: cents }, admin.cookie)
      assert.equal(update.status, 200)
      assert.equal((await get(event.id)).unitPriceCents, cents)
      assert.equal(db.prepare('SELECT typeof(unit_price_cents) AS type FROM events WHERE id = ?').get(event.id).type, 'integer')
    }
    const renamed = await request(`/api/events/${event.id}`, 'PATCH', { ...base, title: 'Título alterado sem quebrar URL' }, admin.cookie)
    assert.equal(renamed.status, 200)
    assert.equal((await renamed.json()).event.slug, event.slug)
  })
  await suite.test('failed replacement keeps previous banner; successful replacement deletes only the old Cloudinary asset', async () => {
    const oldUrl = (await get(event.id)).bannerUrl
    const oldPublicId = db.prepare('SELECT public_id FROM files JOIN events ON files.id = events.banner_file_id WHERE events.id = ?').get(event.id).public_id
    controls({ failUpload: true })
    const failure = await banner(event.id)
    assert.equal(failure.status, 502)
    assert.ok(!(await failure.text()).includes('secret'))
    assert.equal((await get(event.id)).bannerUrl, oldUrl)
    controls({})
    assert.equal((await banner(event.id)).status, 200)
    assert.notEqual((await get(event.id)).bannerUrl, oldUrl)
    await waitFor(() => operations().some((op) => op.action === 'remove' && op.publicId === oldPublicId))
  })
  await suite.test('availability and expiry are dynamic, capacity cannot fall below reservations, archive survives reseeding', async () => {
    const holdAt = Date.now()
    db.prepare("INSERT INTO reservations (id, user_id, event_id, quantity, status, unit_price_cents, total_cents, created_at, updated_at, expires_at) VALUES (?, ?, ?, 2, 'PENDENTE', 3450, 6900, ?, ?, ?)").run(randomUUID(), user.user.id, event.id, holdAt, holdAt, holdAt + 300000)
    const soldOut = await get(event.id)
    assert.equal(soldOut.available, 0)
    assert.equal(soldOut.status, 'sold_out')
    assert.equal((await request(`/api/events/${event.id}`, 'PATCH', { ...base, capacity: 1 }, admin.cookie)).status, 409)
    db.prepare('UPDATE events SET expires_at = ? WHERE id = ?').run(Date.now() - 60000, event.id)
    assert.equal((await get(event.id)).status, 'expired')
    assert.equal((await request(`/api/events/public/${event.slug}`)).status, 200)
    assert.ok(!(await list()).items.some((row) => row.id === event.id))
    assert.ok((await list('', true)).items.some((row) => row.id === event.id))
    assert.equal((await request('/api/events/1', 'DELETE', undefined, admin.cookie)).status, 204)
    await stop(server); server = await start()
    assert.equal((await request('/api/events/1', 'GET', undefined, admin.cookie)).status, 404)
    assert.equal((await request('/api/events/public/spfc-vitoria')).status, 404)
    assert.ok(!(await list('', true)).items.some((row) => row.id === 1))
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM events WHERE seed_key IS NOT NULL').get().total, 3)
  })
  await suite.test('revoked session cannot publish after slow upload and pending files are cleaned', async () => {
    const slow = await create({ ...base, title: 'Upload revogado' })
    controls({ delayUploadMs: 300 })
    const count = operations().filter((op) => op.action === 'upload').length
    const pending = banner(slow.id)
    await waitFor(() => operations().filter((op) => op.action === 'upload').length > count)
    assert.equal((await request('/api/auth/logout', 'POST', undefined, admin.cookie)).status, 204)
    assert.equal((await pending).status, 401)
    assert.equal(db.prepare('SELECT published FROM events WHERE id = ?').get(slow.id).published, 0)
    const publicId = operations().filter((op) => op.action === 'upload').at(-1).publicId
    await waitFor(() => operations().some((op) => op.action === 'remove' && op.publicId === publicId))
  })
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import Database from 'better-sqlite3'
import { authMigration } from '../dist/database/migrations/001-auth.js'
import { filesMigration } from '../dist/database/migrations/002-files.js'
import { eventsMigration } from '../dist/database/migrations/003-events.js'
import { eventContentMigration } from '../dist/database/migrations/004-event-content.js'
import { legacyEventContent } from '../dist/database/event-content.js'

const directory = mkdtempSync(join(tmpdir(), 'reservai-event-pages-test-'))
const databasePath = join(directory, 'app.sqlite')
const db = new Database(databasePath)
db.pragma('foreign_keys = ON')
db.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)')
for (const migration of [authMigration, filesMigration, eventsMigration, eventContentMigration]) {
  db.exec(migration.sql)
  db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(migration.version, Date.now())
}
for (const [name, email, role] of [['Rafael', 'dry1@reservai.com', 'user'], ['Gustavo', 'dry2@reservai.com', 'admin']]) db.prepare('INSERT INTO users (name, email, password_hash, created_at, role) VALUES (?, ?, ?, ?, ?)').run(name, email, 'preserved-test-hash', Date.now(), role)
const start = Date.now() + 86400000
const insert = db.prepare('INSERT INTO events (seed_key, title, genre, location, content, unit_price_cents, capacity, starts_at, ends_at, expires_at, banner_url, published, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 2, ?, ?)')
insert.run('demo-spfc-vitoria', 'Título já editado', 'football', 'Local já editado', '', 4250, 123, start, start + 7200000, start - 3600000, '/spfcxvitoria.png', Date.now(), Date.now())
insert.run('demo-spfc-vasco', 'Vasco preservado', 'football', 'Outro estádio', '## Conteúdo editado\n\n**Preserve isto.**', 9876, 50, start, start + 7200000, start - 3600000, '/spfcxvasco.png', Date.now(), Date.now())
insert.run(null, 'Evento criado pelo usuário', 'pop', 'Espaço Pop', 'Descrição existente', 1550, 2, start, start + 7200000, start - 3600000, '/events/pop.svg', Date.now(), Date.now())
db.prepare('INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('existing-banner', 2, 'reservai/banners/2/existing', 'https://res.cloudinary.com/test/existing.webp', 'image/webp', 1234, 1000, 500, Date.now())
db.prepare('UPDATE events SET banner_file_id = ? WHERE id = 2').run('existing-banner')
const before = db.prepare('SELECT * FROM events ORDER BY id').all()

async function startServer() {
  const probe = createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  const child = spawn(process.execPath, ['dist/server.js'], { env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath, SEED_ON_START: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stderr.on('data', (chunk) => { output += chunk })
  const url = `http://127.0.0.1:${port}`
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output)
    try { if ((await fetch(url + '/api/hello')).ok) return { child, url } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  child.kill()
  throw new Error('Server did not start')
}
async function seed() {
  const child = spawn(process.execPath, ['dist/database/seed-cli.js'], { env: { ...process.env, DATABASE_PATH: databasePath }, stdio: 'ignore' })
  assert.equal(await new Promise((resolve) => child.once('exit', resolve)), 0)
}
test('Event-page migration upgrades existing data without replacing user edits or images', async (suite) => {
  const server = await startServer()
  suite.after(async () => { const exited = new Promise((resolve) => server.child.once('exit', resolve)); server.child.kill(); await exited; db.close() })
  const get = async (reference) => { const response = await fetch(`${server.url}/api/events/public/${reference}`); assert.equal(response.status, 200); return (await response.json()).event }
  await suite.test('backfills original Markdown and stable slugs while preserving prices, dates, uploads and nonempty content', async () => {
    const after = db.prepare('SELECT * FROM events ORDER BY id').all()
    for (let i = 0; i < before.length; i++) {
      const { slug, ...previousFields } = after[i]
      if (i === 0) previousFields.content = before[i].content
      assert.deepEqual(previousFields, before[i])
      assert.ok(slug)
    }
    assert.equal(after[0].content, legacyEventContent[0].content)
    assert.equal(after[1].content, before[1].content)
    assert.equal(after[0].slug, 'spfc-vitoria')
    assert.equal(after[1].slug, 'spfc-vasco')
    assert.equal(after[2].slug, 'evento-3')
    const vitoria = await get('spfc-vitoria')
    assert.equal(vitoria.bannerUrl, '/spfcxvitoria.png')
    assert.equal(vitoria.unitPriceCents, 4250)
    assert.equal(vitoria.location, 'Local já editado')
    assert.match(vitoria.content, /## Antes de ir/)
    const vasco = await get('spfc-vasco')
    assert.equal(vasco.bannerUrl, 'https://res.cloudinary.com/test/existing.webp')
    assert.equal(vasco.content, before[1].content)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM files').get().total, 1)
  })
  await suite.test('running the seed adds missing events once and does not restore intentionally cleared content', async () => {
    db.prepare("UPDATE events SET content = '' WHERE id = 1").run()
    await seed()
    await seed()
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 2)
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM events').get().total, 4)
    assert.equal((await get('spfc-vitoria')).content, '')
    assert.equal((await get('spfc-vitoria')).unitPriceCents, 4250)
    assert.equal((await get('spfc-vasco')).content, before[1].content)
    assert.equal((await get('noite-pop')).capacity, 2)
    assert.deepEqual(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version), [1, 2, 3, 4, 5, 6, 7, 8])
  })
})

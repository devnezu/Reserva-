import { database } from './connection.js'
import { hashPassword, verifyPassword } from '../modules/auth/password.js'
import { config } from '../config/env.js'
import { legacyEventContent } from './event-content.js'

const users = [
  { name: 'Rafael', email: 'dry1@reservai.com', password: 'dryedemais123', role: 'user' },
  { name: 'Gustavo', email: 'dry2@reservai.com', password: 'dryedemais321', role: 'admin' },
  { name: 'Member', email: 'dry3@reservai.com', password: 'dryedemais321', role: 'user' },
]

export async function seed() {
  if (config.production) throw new Error('Seed de demonstração não é permitida em produção')
  for (const user of users) {
    if (database.prepare('SELECT id FROM users WHERE email = ?').get(user.email)) continue
    const hash = await hashPassword(user.password)
    database.transaction(() => {
      const created = database.prepare('INSERT INTO users (name, email, password_hash, created_at, role, demo_account) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(email) DO NOTHING').run(user.name, user.email, hash, Date.now(), user.role)
      if (created.changes && user.role === 'admin') database.prepare("INSERT INTO admin_grants VALUES (?, 'demo', ?)").run(created.lastInsertRowid, Date.now())
    }).immediate()
  }
  const creator = database.prepare('SELECT id FROM users WHERE email = ?').get(users[1].email) as { id: number }
  const day = 24 * 60 * 60 * 1000
  const now = Date.now()
  const events = [
    { key: 'demo-spfc-vitoria', title: 'São Paulo FC x EC Vitória', genre: 'football', location: 'MorumBIS, São Paulo', price: 3450, capacity: 500, days: 3, banner: '/spfcxvitoria.png' },
    { key: 'demo-spfc-vasco', title: 'São Paulo FC x Vasco da Gama', genre: 'football', location: 'MorumBIS, São Paulo', price: 2000, capacity: 300, days: 10, banner: '/spfcxvasco.png' },
    { key: 'demo-pop', title: 'Noite Pop — Últimos 2 ingressos', genre: 'pop', location: 'Espaço Reservaí, São Paulo', price: 1000, capacity: 2, days: 17, banner: '/events/pop.svg' },
  ]
  database.transaction(() => {
    for (const event of events) {
      const startsAt = Math.floor((now + event.days * day) / 60000) * 60000
      const original = legacyEventContent.find((item) => item.key === event.key)
      const slug = original?.slug ?? 'noite-pop'
      database.prepare('INSERT INTO events (seed_key, slug, title, genre, location, content, unit_price_cents, capacity, starts_at, ends_at, expires_at, banner_url, published, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?) ON CONFLICT(seed_key) DO NOTHING').run(event.key, slug, event.title, event.genre, event.location, original?.content ?? '', event.price, event.capacity, startsAt, startsAt + 2 * 60 * 60 * 1000, startsAt - 60 * 60 * 1000, event.banner, creator.id, now, now)
    }
  })()
}

export async function identifyLegacyDemoAccounts() {
  for (const demo of users) {
    const row = database.prepare('SELECT id, password_hash, demo_account FROM users WHERE email = ?').get(demo.email) as { id: number; password_hash: string; demo_account: number } | undefined
    if (!row) continue
    if (row.demo_account) {
      database.prepare("INSERT OR IGNORE INTO admin_grants SELECT id, 'demo', ? FROM users WHERE id = ? AND role = 'admin'").run(Date.now(), row.id)
      continue
    }
    let matches = false
    try { matches = await verifyPassword(row.password_hash, demo.password) } catch { /* Invalid hashes grant no privilege. */ }
    if (matches) database.transaction(() => {
      const changed = database.prepare('UPDATE users SET demo_account = 1 WHERE id = ? AND password_hash = ?').run(row.id, row.password_hash)
      if (changed.changes) database.prepare("INSERT OR IGNORE INTO admin_grants SELECT id, 'demo', ? FROM users WHERE id = ? AND role = 'admin'").run(Date.now(), row.id)
    }).immediate()
  }
}

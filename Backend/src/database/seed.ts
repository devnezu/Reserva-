import { database } from './connection.js'
import { hashPassword } from '../modules/auth/password.js'
import { legacyEventContent } from './event-content.js'

const users = [
  { name: 'Rafael', email: 'dry1@reservai.com', password: 'dryedemais123', role: 'user' },
  { name: 'Gustavo', email: 'dry2@reservai.com', password: 'dryedemais321', role: 'admin' },
]

export async function seed() {
  for (const user of users) {
    if (database.prepare('SELECT id FROM users WHERE email = ?').get(user.email)) continue
    const hash = await hashPassword(user.password)
    database.prepare('INSERT INTO users (name, email, password_hash, created_at, role) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING').run(user.name, user.email, hash, Date.now(), user.role)
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

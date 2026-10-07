import { database } from './connection.js'
import { hashPassword } from '../modules/auth/password.js'

const users = [
  { name: 'Rafael', email: 'dry1@reservai.com', password: 'dryedemais123' },
  { name: 'Gustavo', email: 'dry2@reservai.com', password: 'dryedemais321' },
]

export async function seed() {
  for (const user of users) {
    if (database.prepare('SELECT id FROM users WHERE email = ?').get(user.email)) continue
    const hash = await hashPassword(user.password)
    database.prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING').run(user.name, user.email, hash, Date.now())
  }
}

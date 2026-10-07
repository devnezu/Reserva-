import { database } from './connection.js'
import { migrate } from './migrate.js'
import { identifyLegacyDemoAccounts } from './seed.js'

try {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Uso: yarn admin:grant email@exemplo.com')
  migrate()
  await identifyLegacyDemoAccounts()
  const user = database.prepare('SELECT id, demo_account FROM users WHERE email = ?').get(email) as { id: number; demo_account: number } | undefined
  if (!user) throw new Error('Cadastre a conta antes de provisionar o administrador.')
  if (user.demo_account) throw new Error('Uma conta de demonstração não pode ser administrador de produção. Use uma conta real separada.')
  database.transaction(() => {
    database.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id)
    database.prepare("INSERT INTO admin_grants VALUES (?, 'operator', ?) ON CONFLICT(user_id) DO UPDATE SET source = 'operator', created_at = excluded.created_at").run(user.id, Date.now())
  }).immediate()
  console.log('Administrador provisionado explicitamente.')
} finally { database.close() }

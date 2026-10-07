import { database } from './connection.js'
import { migrate } from './migrate.js'
import { seed } from './seed.js'

try {
  migrate()
  await seed()
  console.log('Seed concluido: Rafael e Gustavo disponiveis.')
} finally {
  database.close()
}

import { database } from './connection.js'
import { migrate } from './migrate.js'
import { seed } from './seed.js'

try {
  migrate()
  await seed()
  console.log('Seed concluido: usuarios e tres eventos disponiveis, com URLs e conteudo da pagina.')
} finally {
  database.close()
}

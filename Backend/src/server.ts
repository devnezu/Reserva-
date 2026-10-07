import { createServer } from 'node:http'
import { database } from './database/connection.js'
import { migrate } from './database/migrate.js'
import { seed, identifyLegacyDemoAccounts } from './database/seed.js'
import { cleanupLimits } from './lib/resource-limits.js'
import { pruneReservationRequests } from './modules/reservations/repository.js'
import { config } from './config/env.js'
import { app } from './app.js'
import { authRepository } from './modules/auth/repository.js'
import { cleanupFiles } from './modules/files/service.js'
import { attachRealtime } from './realtime/server.js'
import { pruneNotifications } from './realtime/outbox.js'
import { reservationsRepository } from './modules/reservations/repository.js'

// Initialize persistent state before accepting any requests.
migrate()
if (config.seedOnStart) await seed()
await identifyLegacyDemoAccounts()
reservationsRepository.expireDue()
void cleanupFiles()
const server = createServer((request, response) => { void app(request, response) })
server.requestTimeout = 15000
const closeRealtime = attachRealtime(server)
const expiry = setInterval(() => {
  try { reservationsRepository.expireDue() }
  catch (error) { console.error('Falha ao persistir expirações:', error) }
}, 1000)
expiry.unref()
const cleanup = setInterval(() => {
  try {
    authRepository.cleanup()
    pruneNotifications(Date.now())
    pruneReservationRequests()
    cleanupLimits()
    void cleanupFiles()
  } catch (error) { console.error('Falha na limpeza periódica:', error) }
}, 30000)
cleanup.unref()
server.listen(config.port, config.host, () => console.log(`Backend: http://${config.host}:${config.port}`))
function shutdown() {
  clearInterval(cleanup)
  clearInterval(expiry)
  closeRealtime()
  server.close(() => { database.close(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

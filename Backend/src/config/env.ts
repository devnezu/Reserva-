const production = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 3001)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT invalida')
if (production && !process.env.APP_ORIGINS) throw new Error('Configure APP_ORIGINS em producao')

export const config = {
  production,
  port,
  host: process.env.HOST ?? '127.0.0.1',
  origins: new Set((process.env.APP_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => new URL(origin.trim()).origin)),
  sessionDurationMs: 7 * 24 * 60 * 60 * 1000,
  seedOnStart: process.env.SEED_ON_START ? process.env.SEED_ON_START === 'true' : !production,
}

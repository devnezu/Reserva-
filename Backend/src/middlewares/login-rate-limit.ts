import { createHash } from 'node:crypto'
import { database } from '../database/connection.js'
import { consumeRate } from '../lib/resource-limits.js'

export function limitLogin(ip: string, email: string, action: 'login' | 'register' = 'login') {
  consumeRate(`auth:${action}:ip:${ip}`, action === 'register' ? 30 : 120, action === 'register' ? 900000 : 60000)
  if (action === 'register') consumeRate(`register:identity:${identity(ip, email)}`, 10, 900000)
}

const identity = (ip: string, email: string) => createHash('sha256').update(`${ip}\0${email}`).digest('hex')
export function loginFailed(ip: string, email: string) { consumeRate(`login:failed:${identity(ip, email)}`, 10, 900000) }
export function loginSucceeded(ip: string, email: string) { database.prepare('DELETE FROM rate_buckets WHERE key = ?').run(`login:failed:${identity(ip, email)}`) }

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'

const path = resolve(process.env.DATABASE_PATH ?? './data/app.sqlite')
mkdirSync(dirname(path), { recursive: true })
export const database = new Database(path)
database.pragma('journal_mode = WAL')
database.pragma('foreign_keys = ON')
database.pragma('busy_timeout = 5000')

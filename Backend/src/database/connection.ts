import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'

const path = resolve(process.env.DATABASE_PATH ?? './data/app.sqlite')
mkdirSync(dirname(path), { recursive: true })
export const database = new Database(path)
database.pragma('journal_mode = WAL')
database.pragma('foreign_keys = ON')
database.pragma('busy_timeout = 5000')

// Busca sem diferenciar maiúsculas nem acentos: "Vitória", "vitoria" e "VIT" encontram o mesmo título.
export const foldText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase()
database.function('fold', { deterministic: true }, (value: unknown) => (typeof value === 'string' ? foldText(value) : value))

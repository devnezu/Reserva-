import { database } from '../database/connection.js'
import { performance } from 'node:perf_hooks'

let anchor = { time: 0, monotonic: performance.now() }
let lastObserved = 0

// The high-water mark is shared by processes and survives restarts. Writers
// advance it only after obtaining their IMMEDIATE transaction.
export function serverTime(clock = Date.now) {
  const previous = (database.prepare('SELECT observed_at FROM security_clock WHERE id = 1').get() as { observed_at: number }).observed_at
  const monotonic = performance.now()
  const wall = clock()
  if (previous < lastObserved) anchor = { time: Math.max(previous, wall), monotonic }
  let candidate = wall
  if (clock === Date.now) {
    // Keep time advancing while the wall clock is corrected backwards. A new
    // process anchors to the shared persisted value, rather than its older clock.
    if (!anchor.time || previous < lastObserved || previous > anchor.time + monotonic - anchor.monotonic) anchor = { time: Math.max(previous, wall), monotonic }
    candidate = Math.max(wall, Math.floor(anchor.time + monotonic - anchor.monotonic))
  }
  const now = Math.max(previous, candidate)
  if (database.inTransaction && now > previous) database.prepare('UPDATE security_clock SET observed_at = ? WHERE id = 1').run(now)
  lastObserved = database.inTransaction ? now : previous
  return now
}

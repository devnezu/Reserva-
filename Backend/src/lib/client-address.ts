import type { IncomingMessage } from 'node:http'
import { isIP } from 'node:net'
import { config } from '../config/env.js'

export function clientAddress(request: IncomingMessage) {
  const peer = request.socket.remoteAddress ?? 'unknown'
  if (!config.trustedProxies.has(peer)) return peer
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded !== 'string') return peer
  const chain = forwarded.split(',').map((ip) => ip.trim())
  let address = peer
  // Walk from the trusted edge; never accept an arbitrary leftmost spoofed IP.
  for (let i = chain.length - 1; i >= 0 && config.trustedProxies.has(address); i--) {
    if (!isIP(chain[i])) return peer
    address = chain[i]
  }
  return address
}

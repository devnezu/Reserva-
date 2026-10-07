export function createWebSocket(): WebSocket {
  const url = new URL('/ws', window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return new WebSocket(url)
}

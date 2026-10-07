export async function getHello(): Promise<{ message: string }> {
  const response = await fetch('/api/hello')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}
export function createWebSocket(): WebSocket {
  const url = new URL('/ws', window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return new WebSocket(url)
}

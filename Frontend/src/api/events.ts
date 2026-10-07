import { apiRequest } from './auth'

export const EVENT_GENRES = { football: 'Futebol', sport: 'Esportes', pop: 'Pop', music: 'Música', other: 'Outros' } as const
export type EventGenre = keyof typeof EVENT_GENRES
export interface EventRecord {
  id: number; title: string; genre: EventGenre; location: string; unitPriceCents: number;
  capacity: number; reservedCount: number; available: number; startsAt: number; endsAt: number; expiresAt: number;
  bannerUrl: string | null; status: 'draft' | 'open' | 'sold_out' | 'expired'; content?: string;
}
export interface EventInput { title: string; genre: EventGenre; location: string; content: string; unitPriceCents: number; capacity: number; startsAt: number; endsAt: number; expiresAt: number }
export interface EventsPage { items: EventRecord[]; total: number; page: number; pageSize: number; totalPages: number }
export interface EventsQuery { page?: number; pageSize?: number; q?: string; genre?: string; manage?: boolean }
export const EVENTS_CHANGED = 'reservai:events-changed'
export function notifyEventsChanged() { window.dispatchEvent(new Event(EVENTS_CHANGED)) }
export const eventsApi = {
  list(query: EventsQuery = {}, signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 6), q: query.q ?? '', genre: query.genre ?? '' })
    return apiRequest<EventsPage>(`/api/events${query.manage ? '/manage' : ''}?${params}`, { signal })
  },
  get: (id: number, signal?: AbortSignal) => apiRequest<{ event: EventRecord }>(`/api/events/${id}`, { signal }),
  create: (data: EventInput) => apiRequest<{ event: EventRecord }>('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: EventInput) => apiRequest<{ event: EventRecord }>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: number) => apiRequest<void>(`/api/events/${id}`, { method: 'DELETE' }),
  uploadBanner: (id: number, file: File) => apiRequest<{ event: EventRecord }>(`/api/events/${id}/banner`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file }),
}

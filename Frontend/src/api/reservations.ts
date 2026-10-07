import { apiRequest } from './auth'

export type ReservationStatus = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA' | 'EXPIRADA'
export interface Reservation {
  id: string; eventId: number; quantity: number; status: ReservationStatus;
  unitPriceCents: number; totalCents: number; createdAt: number; updatedAt: number;
  expiresAt: number; confirmedAt: number | null; cancelledAt: number | null; version: number;
  event: { id: number; slug: string; title: string; location: string; startsAt: number; bannerUrl: string | null };
}
export interface ReservationResponse { reservation: Reservation; serverTime: number; requestId?: string }
export interface ReservationsPage { items: Reservation[]; total: number; page: number; pageSize: number; totalPages: number; serverTime: number }
export const RESERVATIONS_CHANGED = 'reservai:reservations-changed'
export const REALTIME_MESSAGE = 'reservai:realtime-message'
export const REALTIME_READY = 'reservai:realtime-ready'
export interface RealtimeMessage {
  id: number; type: string; serverTime: number;
  data: { requestId?: string; success?: boolean; code?: string; message?: string; reservation?: Reservation; eventId?: number; serverTime?: number };
}
export function notifyReservationsChanged() { window.dispatchEvent(new Event(RESERVATIONS_CHANGED)) }
export const reservationsApi = {
  create: (eventId: number, quantity: number, requestId: string) => apiRequest<ReservationResponse>('/api/reservations', { method: 'POST', headers: { 'Idempotency-Key': requestId }, body: JSON.stringify({ eventId, quantity }) }),
  get: (id: string, signal?: AbortSignal) => apiRequest<ReservationResponse>(`/api/reservations/${encodeURIComponent(id)}`, { signal }),
  list: (page: number, signal?: AbortSignal) => apiRequest<ReservationsPage>(`/api/reservations?page=${page}&pageSize=6`, { signal }),
  confirm: (id: string) => apiRequest<ReservationResponse>(`/api/reservations/${encodeURIComponent(id)}/confirm`, { method: 'POST', headers: { 'X-Request-Id': crypto.randomUUID() } }),
  cancel: (id: string) => apiRequest<ReservationResponse>(`/api/reservations/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'X-Request-Id': crypto.randomUUID() } }),
}

import { createContext } from 'react'
export type RealtimeStatus = 'connected' | 'connecting' | 'offline'
export const RealtimeContext = createContext<RealtimeStatus>('offline')

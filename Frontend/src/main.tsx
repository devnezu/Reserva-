import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/context/AuthProvider'
import { RealtimeProvider } from '@/context/RealtimeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider><App /></RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

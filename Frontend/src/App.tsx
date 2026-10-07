import { Route, Routes } from 'react-router'
import { useCallback, useState } from 'react'
import { Preloader } from '@/components/preloader'
import { PageTransition } from '@/components/page-transition'
import { Toaster } from '@/components/ui/sonner'
import HelloWorld from './pages/HelloWorld'
import Home from './pages/Home'
import Access from './pages/Access'
import Account from './pages/Account'
import Event from './pages/Event'
import { RequireAuth } from '@/components/RequireAuth'
import { RequireAdmin } from '@/components/RequireAdmin'
import AdminEvents from './pages/AdminEvents'
import Reservation from './pages/Reservation'
import NotFound from './pages/NotFound'

export default function App() {
  const [loading, setLoading] = useState(true)
  const finishLoading = useCallback(() => setLoading(false), [])
  return (
    <>
      {loading && <Preloader onComplete={finishLoading} />}
      <PageTransition disabled={loading}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/acesso" element={<Access />} />
          <Route path="/eventos/:id" element={<Event />} />
          <Route path="/helloworld" element={<HelloWorld />} />
          <Route element={<RequireAuth />}>
            <Route path="/conta" element={<Account />} />
            <Route path="/reservas/:id" element={<Reservation />} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin/eventos" element={<AdminEvents />} />
              <Route path="/admin/eventos/:id" element={<AdminEvents />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
      <Toaster />
    </>
  )
}

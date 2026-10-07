import { Route, Routes } from 'react-router'
import { useCallback, useState } from 'react'
import { Preloader } from '@/components/preloader'
import { PageTransition } from '@/components/page-transition'
import { Toaster } from '@/components/ui/sonner'
import HelloWorld from './pages/HelloWorld'
import Home from './pages/Home'
import Access from './pages/Access'
import Account from './pages/Account'
import { RequireAuth } from '@/components/RequireAuth'

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
          <Route path="/helloworld" element={<HelloWorld />} />
          <Route element={<RequireAuth />}>
            <Route path="/conta" element={<Account />} />
          </Route>
        </Routes>
      </PageTransition>
      <Toaster />
    </>
  )
}

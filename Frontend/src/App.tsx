import { Route, Routes } from 'react-router'
import { useCallback, useState } from 'react'
import { Preloader } from '@/components/preloader'
import HelloWorld from './pages/HelloWorld'
import Home from './pages/Home'
import Access from './pages/Access'

export default function App() {
  const [loading, setLoading] = useState(true)
  const finishLoading = useCallback(() => setLoading(false), [])
  return (
    <>
      {loading && <Preloader onComplete={finishLoading} />}
      <div inert={loading} aria-hidden={loading || undefined}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/acesso" element={<Access />} />
      <Route path="/helloworld" element={<HelloWorld />} />
    </Routes>
      </div>
    </>
  )
}

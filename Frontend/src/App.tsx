import { Route, Routes } from 'react-router'
import HelloWorld from './pages/HelloWorld'
import Home from './pages/Home'
import Access from './pages/Access'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/acesso" element={<Access />} />
      <Route path="/helloworld" element={<HelloWorld />} />
    </Routes>
  )
}

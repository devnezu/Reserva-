import { Route, Routes } from 'react-router'
import HelloWorld from './pages/HelloWorld'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<main className="min-h-screen bg-black" />} />
      <Route path="/helloworld" element={<HelloWorld />} />
    </Routes>
  )
}

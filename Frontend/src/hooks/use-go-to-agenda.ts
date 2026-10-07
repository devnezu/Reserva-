import { useLocation, useNavigate } from 'react-router'
import { useReducedMotion } from 'motion/react'

const AGENDA_ID = 'proximos-jogos'

// Leva até a seção "Próximos jogos" da home, de qualquer rota.
export function useGoToAgenda() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const reducedMotion = useReducedMotion()

  return function goToAgenda() {
    if (pathname !== '/') void navigate('/')
    // A seção pode ainda não existir quando viemos de outra rota; espera ela aparecer.
    let tries = 0
    const scroll = () => {
      const section = document.getElementById(AGENDA_ID)
      if (section) {
        section.focus({ preventScroll: true })
        section.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
      } else if (tries++ < 40) window.setTimeout(scroll, 50)
    }
    window.setTimeout(scroll, 50)
  }
}

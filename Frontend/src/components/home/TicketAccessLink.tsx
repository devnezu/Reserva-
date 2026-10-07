import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { useReducedMotion } from 'motion/react'
import { useAuth } from '@/hooks/use-auth'

export function TicketAccessLink(props: Omit<ComponentProps<typeof Link>, 'to' | 'onClick'>) {
  const { status } = useAuth()
  const reducedMotion = useReducedMotion()
  const authenticated = status === 'authenticated'
  return <Link {...props} to={authenticated ? '/#proximos-jogos' : '/acesso'} onClick={(event) => {
    if (!authenticated || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const section = document.getElementById('proximos-jogos')
    section?.focus({ preventScroll: true })
    section?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
  }} />
}

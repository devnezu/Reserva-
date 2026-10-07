export interface Match {
  id: string
  home: string
  away: string
  homeCrest?: string
  awayCrest?: string
  competition: string
  date: string
  time: string
  image: string
}

export const matches: Match[] = [
  { id: 'spfc-vitoria', home: 'São Paulo FC', homeCrest: '/São_Paulo_Futebol_Clube.png', away: 'EC Vitória', awayCrest: '/vitoria.jpg', competition: 'Brasileirão 2026', date: '10/10/2026', time: '21:00', image: '/spfcxvitoria.png' },
  { id: 'spfc-vasco', home: 'São Paulo FC', homeCrest: '/São_Paulo_Futebol_Clube.png', away: 'Vasco da Gama', awayCrest: '/vasco.png', competition: 'Brasileirão 2026', date: '17/10/2026', time: '21:00', image: '/spfcxvasco.png' },
]

export const featuredMatch = matches[0]

export interface TicketSector {
  id: string
  name: string
  price: number
}

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
  // Conteúdo da página do evento. Fixo por enquanto; virá da API.
  venue: string
  description: string[]
  info: string[]
  sectors: TicketSector[]
}

const sectors: TicketSector[] = [
  { id: 'arquibancada', name: 'Arquibancada', price: 60 },
  { id: 'cadeira-superior', name: 'Cadeira superior', price: 120 },
  { id: 'cadeira-especial', name: 'Cadeira especial', price: 220 },
]

const info = [
  'Abertura dos portões 2 horas antes do início da partida.',
  'Apresente o ingresso digital e um documento com foto na entrada.',
  'Limite de 4 ingressos por compra.',
]

export const matches: Match[] = [
  {
    id: 'spfc-vitoria', home: 'São Paulo FC', homeCrest: '/São_Paulo_Futebol_Clube.png', away: 'EC Vitória', awayCrest: '/vitoria.jpg', competition: 'Brasileirão 2026', date: '10/10/2026', time: '21:00', image: '/spfcxvitoria.png',
    venue: 'Morumbis, São Paulo - SP',
    description: [
      'O Tricolor recebe o Vitória em mais uma rodada do Brasileirão 2026, em uma noite de sábado para lotar a arquibancada e empurrar o time do primeiro ao último minuto.',
      'Garanta seu lugar com antecedência, escolha o setor que combina com você e viva o jogo de perto, com a torcida que nunca para de cantar.',
    ],
    info, sectors,
  },
  {
    id: 'spfc-vasco', home: 'São Paulo FC', homeCrest: '/São_Paulo_Futebol_Clube.png', away: 'Vasco da Gama', awayCrest: '/vasco.png', competition: 'Brasileirão 2026', date: '17/10/2026', time: '21:00', image: '/spfcxvasco.png',
    venue: 'Morumbis, São Paulo - SP',
    description: [
      'Clássico nacional no Morumbis: São Paulo e Vasco se enfrentam pelo Brasileirão 2026 em um duelo de camisas pesadas e muita história.',
      'Garanta seu lugar com antecedência, escolha o setor que combina com você e faça parte da festa na arquibancada.',
    ],
    info, sectors,
  },
]

export const featuredMatch = matches[0]

export const getMatch = (id: string | undefined) => matches.find((match) => match.id === id)
export const matchPath = (match: Match) => `/eventos/${match.id}`

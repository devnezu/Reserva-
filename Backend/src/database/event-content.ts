// Original event-page copy, retained as seed data after moving the page to SQLite.
const beforeGoing = [
  '## Antes de ir',
  '',
  '- Abertura dos portões 2 horas antes do início da partida.',
  '- Apresente o ingresso digital e um documento com foto na entrada.',
  '- Limite de 4 ingressos por compra.',
].join('\n')

export const legacyEventContent = [
  {
    key: 'demo-spfc-vitoria', slug: 'spfc-vitoria',
    content: [
      'O Tricolor recebe o Vitória em mais uma rodada do Brasileirão 2026, em uma noite de sábado para lotar a arquibancada e empurrar o time do primeiro ao último minuto.',
      'Garanta seu lugar com antecedência, escolha o setor que combina com você e viva o jogo de perto, com a torcida que nunca para de cantar.',
      beforeGoing,
    ].join('\n\n'),
  },
  {
    key: 'demo-spfc-vasco', slug: 'spfc-vasco',
    content: [
      'Clássico nacional no Morumbis: São Paulo e Vasco se enfrentam pelo Brasileirão 2026 em um duelo de camisas pesadas e muita história.',
      'Garanta seu lugar com antecedência, escolha o setor que combina com você e faça parte da festa na arquibancada.',
      beforeGoing,
    ].join('\n\n'),
  },
] as const

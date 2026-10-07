# Uso de IA

Registro de como usei assistentes de IA neste desafio. Todo o código foi gerado com IA, sob minha direção; a responsabilidade pela solução é minha.

## Ferramentas e modelos

| Ferramenta | Modelo | Onde ajudou |
|---|---|---|
| Codex CLI 0.160.1 (OpenAI) | `gpt-6.1-sol` | Ambiente e estrutura inicial dos dois projetos; todo o backend: autenticação e sessão, cadastro, upload de fotos, eventos com papéis de acesso, reservas, WebSocket, migrations e seed; testes do backend; QR Code da reserva; preloader. |
| Claude Code (Anthropic) | Claude Opus 5.5 | Frontend: home, tela de acesso e animações, notificações, conta, página do evento, reservas, responsivo e acessibilidade básica. No backend, a busca sem diferenciar acentos. Na reta final: teste de interface do conflito 409, teste de expiração com outro usuário, versionamento dos lockfiles e apoio na documentação. |

As duas ferramentas trabalharam ao mesmo tempo, no mesmo repositório e na mesma árvore de trabalho. Para isso, abri cada sessão com a mesma regra: conferir o Git antes de editar, preservar alterações de terceiros, não usar comandos destrutivos e commitar apenas o que fosse da própria tarefa.

## Três exemplos de interação

### 1. Concorrência na reserva dos últimos ingressos (Codex)

- **Objetivo:** garantir que duas pessoas disputando os últimos ingressos nunca ultrapassem a capacidade do evento.
- **Trecho do prompt:** "A próxima task é bem mais pesada, vamos montar o passo a passo para a solução. [...] O que imagino que falta é um controle de estoque de ingressos." Em seguida: "Busca na web, empresas que tiveram o mesmo problema. E soluções que usaram para isso, melhores práticas que garantam que o problema não ocorra."
- **Resumo da sugestão:** calcular a ocupação a partir das próprias reservas (confirmadas mais pendentes ainda válidas) e fazer a verificação e a inserção dentro de uma única transação de escrita do SQLite (`BEGIN IMMEDIATE`), que vale também entre processos diferentes. Depois da pesquisa (relatos da Shopify, SeatGeek e Eventbrite e a documentação da Stripe), a proposta ganhou dois pontos: chave de idempotência na criação da reserva e recuperação das notificações quando a conexão cai.
- **O que decidi:** pedi primeiro o plano, sem código, e só depois da pesquisa autorizei a implementação ("Pode iniciar a integração, ponta a ponta"). Mantive o SQLite e a transação como única autoridade sobre a disponibilidade; fila de espera ficou fora do escopo.
- **Como validei:** testes de integração em SQLite real, sem mocks da proteção: dois processos do backend disputando 2 ingressos em um evento de capacidade 2 (um sucesso, um 409), uma rajada de 40 requisições entre dois processos e confirmação e cancelamento concorrendo pela mesma reserva.
- **Correção:** ao conferir a entrega contra o enunciado, notei que o teste de expiração provava que a reserva expirada deixava de ocupar capacidade, mas não mostrava outro usuário reservando esses ingressos. Pedi o caso que faltava: recusa um milissegundo antes de `expiresAt`, sucesso no instante exato e depois dele, com o saldo conferido direto no banco.

### 2. Cadastro mantido contra a sugestão da IA (Codex)

- **Objetivo:** implementar autenticação com sessão, seed de dois usuários e senhas com Argon2id.
- **Trecho do prompt:** "A primeira etapa deve ser a autenticação, a seed roda, e cria dois users [...] quero sessão completa no frontend, e nas senhas no backend podemos seguir a sugestão usando argon2id."
- **Resumo da sugestão:** além do login, o Codex avisou que iria adaptar a tela de acesso "removendo o cadastro conforme o escopo definido", já que o enunciado diz "sem cadastro".
- **O que decidi:** rejeitei essa parte ("Não é para remover do frontend o cadastro, porque é algo que vamos integrar também") e, mais tarde, pedi a integração do cadastro no backend. O motivo: não quis entregar um MVP. Quis um projeto refinado, alinhado com quem eu sou, que mostrasse a bagagem de mais de cinco anos trabalhando com programação. É um desvio consciente do escopo e está declarado como tal na documentação; recuperação de senha continua fora.
- **Como validei:** testes de integração do cadastro (validação de entrada, senha armazenada só como hash, e-mails duplicados e cadastros concorrentes sem sobrescrever conta existente, limite de tentativas) e teste manual do cadastro no navegador, feito por mim.

### 3. Busca de eventos sem diferenciar acentos (Claude Code)

- **Objetivo:** fazer a busca por nome encontrar o evento independentemente de maiúsculas e acentos.
- **Trecho do prompt:** "Integre lowercase nos campos/inputs e etc... Vitória = Vitoria = vit = oria aparece o resultado."
- **Resumo da sugestão:** a IA verificou que a busca é feita no servidor e que o `LIKE` do SQLite só ignora maiúsculas em letras sem acento, então "vitoria" não encontrava "Vitória". Em vez de mexer nos campos da tela, propôs normalizar os dois lados da comparação no banco: registrou uma função que remove acentos e converte para minúsculas e passou a usá-la na consulta.
- **O que decidi:** aceitei. A correção ficou no backend, que é a autoridade sobre a busca, e vale para a home e para a tela de gerenciamento.
- **Como validei:** um teste de integração novo com seis variações do termo ("Vitória", "vitoria", "VITORIA", "vit", "oria", "VITÓRIA") retornando o mesmo evento, a suíte do backend inteira passando, e chamadas diretas à API em execução, incluindo um termo que não deve retornar nada.
- **Correção ou rejeição:** não houve neste exemplo.

## Como valido o que a IA produz

- Regras de negócio e concorrência são cobertas por testes automatizados no banco real de testes, não por inspeção visual.
- Mudanças de interface são conferidas no navegador, em tamanho de desktop e de celular.
- Antes de aceitar uma mudança em arquivo compartilhado, confiro o diff para garantir que só entrou o que foi pedido.
- Quando não gosto do resultado, peço para desfazer. Um exemplo fora dos três acima: uma animação de troca de painel no desktop foi implementada, não me agradou e foi revertida.

## Tempo efetivo de trabalho

Aproximadamente **6 horas e 45 minutos**, em um único dia:

- início às 08:52, com cerca de 30 minutos iniciais de preparação do ambiente e das ferramentas;
- uma pausa de 10 minutos para o almoço;
- trabalho contínuo até por volta das 15:50, quando este registro foi escrito.

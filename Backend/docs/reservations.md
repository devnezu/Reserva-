# Reservas e disponibilidade

O backend e o SQLite decidem quem conseguiu reservar. HTTP cria/consulta/confirma/cancela; WS publica resultados privados e disponibilidade pública. Não há processamento de pagamento.

## Persistência e capacidade

A migration 006 cria `reservations`, `reservation_requests` e `realtime_outbox`, com índices por dono, evento e expiração. Preserva usuários, imagens e metadados dos eventos existentes. A coluna antiga `events.reserved_count` permanece por compatibilidade de schema; não participa mais da disponibilidade. `reservedCount` na API é calculado pelas reservas.

```text
ocupados = SUM(quantity de CONFIRMADA ou PENDENTE com expiresAt > agora)
disponíveis = capacity - ocupados
```

Criação, transições, edição da capacidade e arquivamento usam transações de escrita. A criação usa `BEGIN IMMEDIATE` e captura o horário depois de adquirir o bloqueio. Validação, preço do evento, disponibilidade, reserva, registro de idempotência e notificações ficam na mesma transação. Dois processos no mesmo banco não podem aprovar simultaneamente a mesma capacidade restante. Não há operações de rede dentro da transação.

A quantidade deve ser um número inteiro de 1 a 4; valores em centavos são inteiros. O preço e o total são capturados pelo servidor e não mudam com edições posteriores do evento. A criação exige evento publicado, não arquivado, com início e prazo de novas reservas no futuro. Administradores não podem reduzir a capacidade abaixo da ocupação efetiva.

SQLite usa WAL, foreign keys e `busy_timeout=5000`. O driver foi atualizado de 11.10 para `better-sqlite3` 12.8.0, com SQLite 3.51.3, preservando compatibilidade com Node 20.20.2 no Windows. Essa versão inclui a correção da [falha WAL-reset entre conexões concorrentes](https://www.sqlite.org/wal.html#walreset). Se não conseguir adquirir o bloqueio dentro desse prazo, a reserva retorna 503 `TEMPORARILY_UNAVAILABLE`; isso não significa falta de ingressos. O cliente pode repetir a mesma chave. Todos os processos precisam usar o mesmo arquivo SQLite no mesmo host; bancos independentes ou cópias do arquivo não coordenam capacidade.

## Prazo e estados

`expiresAt = createdAt + 300000`, ambos gerados no servidor. O prazo de novas reservas do evento e o prazo individual da reserva são campos diferentes. Uma reserva já criada pode ser confirmada até o próprio prazo, mesmo se o prazo de novas reservas do evento encerrar nesse intervalo.

| Operação | Regra |
| --- | --- |
| Criar | Nasce PENDENTE e ocupa a quantidade |
| Confirmar | PENDENTE com agora < expiresAt passa a CONFIRMADA; ocupação não aumenta |
| Confirmar novamente | CONFIRMADA retorna 200 com a mesma reserva, sem alterar preço, total, datas ou versão |
| Cancelar | Somente PENDENTE válida passa a CANCELADA e libera a quantidade |
| Cancelar novamente | 409 INVALID_TRANSITION |
| Expirar | PENDENTE com agora >= expiresAt é EXPIRADA e não ocupa capacidade |
| Confirmar/cancelar expirada | 409 RESERVATION_EXPIRED |
| Alterar quantidade, preço, dono ou prazo | Não há endpoint; triggers também impedem essas alterações no banco |
| Reativar um estado final | Não permitido; protegido também por trigger |

A validade é avaliada nas consultas e comandos. Um worker a cada segundo persiste expirações e suas notificações em lotes; atraso ou parada do worker não faz uma pendente vencida ocupar capacidade. Expiração persistida antes de uma recusa é commitada, em vez de ser revertida junto com a resposta de conflito.

## HTTP e propriedade

Todos os endpoints exigem sessão. Mutações também exigem `Origin` permitido e `X-Requested-With: Reservai`. O dono é obtido da sessão; dados do cliente não definem o usuário da reserva. Administradores seguem a mesma restrição de propriedade.

| Método | Rota | Resultado |
| --- | --- | --- |
| POST | /api/reservations | JSON `{eventId, quantity}`, header `Idempotency-Key`; 201 na criação, 200 na repetição bem-sucedida |
| GET | /api/reservations?page=1&pageSize=6 | Somente reservas do dono, ordenadas por criação e ID decrescentes; pageSize 1–50 |
| GET | /api/reservations/:id | Reserva do dono e `serverTime` |
| POST | /api/reservations/:id/confirm | Confirmação simulada; header opcional `X-Request-Id` |
| POST | /api/reservations/:id/cancel | Cancelamento; header opcional `X-Request-Id` |

A política de propriedade é **404 RESERVATION_NOT_FOUND** tanto para inexistentes quanto para reservas alheias, sem revelar seus dados. Quantidade inválida retorna 400 `INVALID_QUANTITY`; capacidade insuficiente retorna 409 `INSUFFICIENT_CAPACITY`; evento encerrado retorna 409 `EVENT_CLOSED`.

As respostas de mutação incluem `requestId` e `serverTime`. As bem-sucedidas incluem `reservation`, com evento, quantidade, estado efetivo, preço unitário e total em centavos, criação, atualização, expiração, confirmação/cancelamento e versão. Eventos arquivados permanecem no histórico do dono.

## Idempotência

O frontend gera um UUID por tentativa de criação e o envia como `Idempotency-Key` (16–128 caracteres ASCII alfanuméricos, hífen ou underscore). A chave é única por usuário. Repetir a mesma chave/evento/quantidade retorna a mesma reserva, inclusive se já tiver expirado ou sido finalizada, sem renovar seu prazo. Uma mesma chave com parâmetros diferentes retorna 409 `IDEMPOTENCY_CONFLICT`. Recusas de negócio também ficam registradas; tentar novamente depois que o estoque mudar exige uma nova intenção/chave.

O navegador mantém somente os dados da tentativa incerta em `sessionStorage`, vinculados ao usuário e evento. Não guarda tokens nem senhas. Se a resposta se perder ou houver 503, o botão permite verificar a mesma tentativa. Recarregar preserva a chave. Uma resposta definitiva limpa a tentativa.

## WS e outbox

`/ws` exige cookie de sessão e origem permitida. Logout e expiração encerram a conexão. A cada envio, a sessão é verificada novamente. Há ping/pong e limite de buffer para clientes lentos.

| Mensagem | Público |
| --- | --- |
| reservation.result | Somente o solicitante; requestId, success, httpStatus, reserva ou código/mensagem de recusa |
| reservation.updated | Somente o dono; reserva atualizada e serverTime |
| event.availability.updated | Usuários conectados; eventId, capacity, reservedCount, available e serverTime, sem identificação do comprador |

As notificações são inseridas na outbox junto com a mudança e só são lidas após o commit. Cada conexão possui cursor próprio; dois servidores não consomem as notificações um do outro. O envelope tem `{id, type, data, serverTime}`; `id` é a sequência global persistida. O payload público não expõe reservas, e-mails ou IDs dos compradores.

Ao conectar, o servidor envia a mensagem legada Hello World e `realtime.ready` com cursor e horário. Para recuperar mensagens, o cliente envia `{type: "resume", after: ultimoIdRecebido}`. O servidor repete apenas mensagens públicas ou do usuário autenticado, em ordem; `realtime.cursor` avança também pelos registros privados de outros usuários sem expor seu conteúdo. Notificações ficam retidas por sete dias.

Não se presume entrega exatamente uma vez ao navegador: mensagens podem ser repetidas durante recuperação. O frontend descarta IDs já processados, reconecta com espera progressiva e sempre consulta o estado HTTP atual ao reconectar. Sem WS, consultas periódicas continuam funcionando. Uma conexão perdida não cancela a reserva nem reinicia seu prazo.

## Frontend

O botão de `/eventos/:id` reserva e abre `/reservas/:id`. A tela protegida exibe resumo, preço capturado, total, estado, contagem regressiva e ações. “Minhas reservas” fica em `/conta?secao=eventos`, com paginação e todos os estados do usuário. O contador usa o horário do servidor e tempo monotônico decorrido; ações são bloqueadas localmente no fim do prazo e o estado é consultado novamente.

O resultado da criação também pode chegar pelo WS, correlacionado por requestId, antes da resposta HTTP. O frontend conclui a tentativa apenas uma vez. Disponibilidade e reservas são reconsultadas quando chegam notificações, evitando aplicar snapshots antigos recuperados como se fossem o estado atual.

## Verificação

`yarn test` inclui processos HTTP/WS distintos compartilhando SQLite temporário, corrida pelos dois últimos ingressos, quarenta solicitações concorrentes, repetição de criação/confirmar, cancelar, propriedade, preço capturado, reinício e replay do WS. Testes com relógio injetado verificam o instante exato de expiração, funcionamento sem worker e rollback quando a outbox falha.

Para demonstrar no navegador:

1. Inicie `yarn dev` em Backend e Frontend.
2. Abra dois perfis/janelas de navegação com cookies separados; entre como Rafael e Gustavo.
3. Use o evento Noite Pop do seed, de capacidade 2, enquanto estiver disponível, ou crie um novo evento com capacidade 2.
4. Solicite 2 ingressos em cada janela simultaneamente. Uma recebe a pendente; outra recebe recusa e estoque atualizado.
5. Cancele a vencedora ou aguarde 5 minutos. As duas telas recebem o estoque liberado.
6. Reserve novamente e confirme: ingressos continuam ocupados e não há cobrança real.

Reservas confirmadas são finais. Para repetir a demonstração depois de confirmar, use outro evento com capacidade 2; não há reembolso nem reset de reservas pela aplicação.

## Arquivos envolvidos

| Parte | Arquivos |
| --- | --- |
| Migração e inicialização | `Backend/src/database/migrations/006-reservations.ts`, `Backend/src/database/migrate.ts`, `Backend/src/app.ts`, `Backend/src/server.ts` |
| Reservas e estoque | `Backend/src/modules/reservations/repository.ts`, `Backend/src/modules/reservations/routes.ts`, `Backend/src/modules/events/inventory.ts`, `Backend/src/modules/events/repository.ts` |
| Notificações | `Backend/src/realtime/outbox.ts`, `Backend/src/realtime/server.ts`, `Backend/src/modules/files/repository.ts` |
| Dependências e testes | `Backend/package.json`, `Backend/yarn.lock`, `Backend/tests/reservations.test.mjs`, `Backend/tests/reservation-boundaries.test.mjs`, `Backend/tests/events.test.mjs`, `Backend/tests/event-pages.test.mjs`, `Backend/tests/files.test.mjs` |
| API, conexão e hooks | `Frontend/src/api/reservations.ts`, `Frontend/src/context/RealtimeProvider.tsx`, `Frontend/src/context/realtime-context.ts`, `Frontend/src/hooks/use-reservations.ts`, `Frontend/src/hooks/use-server-countdown.ts` |
| Interface | `Frontend/src/components/reservations/ReserveButton.tsx`, `Frontend/src/components/reservations/ReservationCard.tsx`, `Frontend/src/components/reservations/MyReservations.tsx`, `Frontend/src/components/reservations/RealtimeStatus.tsx`, `Frontend/src/components/AccountLayout.tsx` |
| Páginas e rotas | `Frontend/src/pages/Reservation.tsx`, `Frontend/src/pages/Event.tsx`, `Frontend/src/pages/Account.tsx`, `Frontend/src/App.tsx`, `Frontend/src/main.tsx` |
| Documentação | `README.md`, `Backend/README.md`, `Backend/docs/reservations.md` |

O `Backend/yarn.lock` foi regenerado localmente; permanece ignorado pelas regras atuais do `.gitignore`, que foram preservadas. A versão do driver corrigido está fixada no `Backend/package.json`.

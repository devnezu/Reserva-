# Correções de segurança

Implementação dos achados A1–A6 e M1–M7 de [RELATORIO_SEGURANCA.md](../RELATORIO_SEGURANCA.md). As categorias baixas não fazem parte desta alteração.

## Autorização e produção

Mutações de eventos validam a sessão e o papel depois da leitura do corpo e novamente dentro da transação de escrita. Uploads também revalidam o acesso dentro da transação que vincula a imagem. Arquivamento e vínculo do banner são atômicos; uma falha na resposta após o commit não agenda a exclusão do arquivo já salvo.

A seed continua disponível em desenvolvimento e idempotente. Em `NODE_ENV=production`, sua execução manual é recusada e `SEED_ON_START=true` impede a inicialização. Contas marcadas como demonstração não conseguem login nem usar sessões existentes em produção. Contas antigas são reconhecidas como demo somente por hash compatível com suas credenciais de teste, não por atribuição automática de papel.

As migrations 003/004 não promovem mais contas existentes por e-mail. A migration 008 registra concessões administrativas. Contas antigas dos e-mails reservados sem comprovação de demo/concessão não ganham acesso admin por seu papel isolado. Papéis existentes não são apagados arbitrariamente. Uma conta real pode ser provisionada por um operador com acesso ao servidor:

```sh
cd Backend
yarn admin:grant email-da-conta-real@exemplo.com
```

O comando exige uma conta previamente cadastrada e recusa converter a conta de demonstração em administrador de produção. Uma conta de demonstração reconhecida mantém acesso em desenvolvimento.

`TRUSTED_PROXIES` aceita uma lista de IPs exatos do proxy. Deixar vazia quando não houver proxy. Configurar somente proxies que removam ou componham corretamente X-Forwarded-For; a resolução caminha da direita para a esquerda e não confia no endereço arbitrário mais à esquerda.

## Limites persistentes

Os contadores e permissões temporárias de uso ficam no SQLite. As transações IMMEDIATE tornam sua aquisição consistente entre processos no mesmo banco/host. Permissões temporárias possuem prazo, para um processo morto não bloquear recursos indefinidamente.

| Operação | Limite |
| --- | --- |
| Mutações de reserva | 60/minuto por usuário e 300/minuto por IP |
| Novas intenções de reserva | 1.000/dia por usuário; repetir uma chave existente não cria intenção nova |
| Reservas pendentes válidas | 10 por usuário; até 4 por usuário/evento |
| Conexões WS | 3 por usuário, 20 por IP e 128 globais |
| Aberturas de WS | 60/minuto por IP |
| Mensagens de WS | 60/minuto por usuário; um resume por conexão |
| Uploads simultâneos | 2 globais e 1 por usuário, compartilhados entre avatar/banner e instâncias |
| Uploads iniciados | 10 em 15 minutos por usuário |
| Corpo de upload / processamento da imagem | 15 segundos cada; processamento do provedor mantém timeout de 15 segundos |
| Login recebido | 120/minuto por IP |
| Credenciais inválidas | 10 por par IP/e-mail em 15 minutos; senha correta ainda pode entrar e limpa o contador de falhas |
| Cadastro recebido | 30 em 15 minutos por IP e 10 por par IP/e-mail |

Respostas 429 incluem código seguro e Retry-After. O frontend mantém a chave de uma tentativa incerta quando recebe 408/429, evitando duplicar a reserva depois de uma resposta perdida.

## Retenção e tempo

As tentativas recusadas sem reserva são removidas depois de sete dias. Depois dessa janela, repetir uma chave que só teve recusa passa a ser uma nova intenção. As chaves vinculadas a reservas criadas **não são removidas**: continuam recuperando a reserva original, inclusive confirmada/cancelada/expirada. O usuário deve criar UUID novo para uma intenção nova.

O tempo do negócio nunca recua abaixo do maior horário persistido. Durante uma correção regressiva do relógio, performance.now mantém seu avanço no processo. Outras instâncias e reinícios usam o piso do SQLite. A edição da capacidade persiste a expiração observada, com notificações, antes de liberar espaço; a confirmação também verifica a invariante de ocupação. Manter o relógio do host sincronizado continua necessário: não há fonte externa de tempo para medir downtime de um host com relógio incorreto.

## WS e arquivos

A consulta da outbox filtra mensagens públicas/do usuário no próprio SQL. Notificações de rascunhos são filtradas na produção e no replay histórico. O resume serve para recuperar uma desconexão, e não para reprocessar repetidamente a história na mesma conexão. O frontend consulta o estado HTTP ao reconectar.

A fila de limpeza guarda tentativas e próximo horário. Falhas usam backoff e deixam outros arquivos avançarem. Falhas de leitura/configuração são capturadas pela operação inteira e não escapam como rejeição sem tratamento. Assets já vinculados no banco não são compensados por uma falha posterior da resposta HTTP.

## Migrações e verificação

As migrations 007/008 criam as proteções, os campos de limpeza e as concessões administrativas. São aplicadas ao iniciar o Backend ou executar a seed em desenvolvimento. O banco local foi atualizado sem reduzir as contagens de usuários, eventos, reservas ou arquivos. Não houve alteração das credenciais reais do Cloudinary.

```sh
cd Backend
yarn test
yarn typecheck
```

```sh
cd Frontend
yarn test
yarn build
yarn lint
```

Os testes novos usam bancos temporários, dois processos HTTP/WS compartilhando SQLite e Cloudinary simulado. Foram verificados revogação durante envio, limites entre instâncias, visibilidade de rascunhos, regressão de tempo, seed/contas em produção, grants, concorrência com arquivamento e falhas/backoff de limpeza. O frontend cobre 401 atrasado, expiração verdadeira, troca de sessão em outra aba e preservação de idempotência após 429.

## Arquivos desta tarefa

- Configuração e migrações: `Backend/.env.example`, `Backend/src/config/env.ts`, `Backend/src/database/migrate.ts`, migrations `003-events.ts`, `004-event-content.ts`, `007-security.ts`, `008-admin-grants.ts`, `seed.ts`, `admin-cli.ts`.
- Proteções compartilhadas: `Backend/src/lib/server-time.ts`, `resource-limits.ts`, `client-address.ts`, `Backend/src/middlewares/login-rate-limit.ts`, `error-handler.ts`.
- Backend: `Backend/src/server.ts`; controller/service/repository de auth; routes/repository/inventory de events; controller/image/service/repository de files; routes/repository de reservations; `Backend/src/realtime/server.ts` e `outbox.ts`.
- Testes e comando: `Backend/package.json`, `Backend/tests/security.test.mjs`, ajustes de fixtures em `auth.test.mjs`, `event-pages.test.mjs`, `files.test.mjs`, `reservation-boundaries.test.mjs`.
- Frontend: `Frontend/src/context/AuthProvider.tsx`, `AuthProvider.security.test.tsx`, `Frontend/src/components/reservations/ReserveButton.tsx`, `ReserveButton.security.test.tsx`; seletor do teste `Event.conflict.test.tsx` corrigido para acompanhar a remontagem após autenticação.
- Documentação: `RELATORIO_SEGURANCA.md`, este arquivo.

As exclusões de arquivos, alterações de rotas, README e outros documentos presentes na árvore de trabalho são de outros colaboradores e foram preservadas. Não foi feito commit nesta tarefa.

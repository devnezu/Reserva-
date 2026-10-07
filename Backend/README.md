# Backend Reservaí

HTTP nativo do Node + TypeScript + SQLite. Implementa cadastro, autenticacao por e-mail e senha, sessoes persistentes, eventos com RBAC e WebSocket autenticado.

```sh
yarn install
yarn dev
```

Em desenvolvimento, a inicializacao executa as migrations e cria os dois usuarios de demonstracao antes de aceitar requisicoes. O seed e idempotente: nao duplica contas nem altera senhas existentes.

| Nome | E-mail | Papel |
| --- | --- | --- |
| Rafael | dry1@reservai.com | user |
| Gustavo | dry2@reservai.com | admin |

As senhas de demonstracao sao as definidas em `src/database/seed.ts`. O banco guarda apenas hashes Argon2id. Execute `yarn seed` para aplicar migrations e seed manualmente.

```text
src/
  server.ts                   HTTP, WebSocket e inicializacao
  app.ts                      rotas e tratamento de erros
  config/env.ts               configuracao validada
  database/
    connection.ts             SQLite com WAL e foreign keys
    migrate.ts                migrations transacionais
    migrations/001-auth.ts    users, sessions e auth_attempts
    migrations/002-files.ts   arquivos, avatar e fila de limpeza
    migrations/003-events.ts  eventos e papeis de acesso
    migrations/004-event-content.ts  conteudo, arquivamento e papeis dos usuarios de teste
    migrations/005-event-pages.ts    URLs estaveis e migracao do conteudo original
    event-content.ts          textos originais dos jogos em Markdown
    seed.ts                   dois usuarios e tres eventos futuros
    seed-cli.ts               comando yarn seed
  modules/auth/
    routes.ts                 endpoints
    controller.ts             entrada e resposta HTTP
    service.ts                login, criacao e revogacao de sessoes
    repository.ts             consultas SQL parametrizadas
    schemas.ts                validacao do login
    password.ts               Argon2id
    cookies.ts                cookie da sessao
    permissions.ts            permissoes por papel (RBAC)
  modules/events/
    routes.ts                 catalogo, detalhes, CRUD administrativo e banner
    repository.ts             SQL, ordenacao e paginacao
    schemas.ts                validacao de eventos e filtros
  modules/files/
    routes.ts                 upload autenticado de avatar
    controller.ts             autenticacao e limites de envio
    image.ts                  validacao e preparo da imagem com Sharp
    service.ts                upload, troca da foto e limpeza
    repository.ts             metadados dos arquivos no SQLite
  storage/cloudinary.ts       adapter de upload e remocao no Cloudinary
  middlewares/
    require-auth.ts           protecao de endpoints
    require-admin.ts          exige permissao events:manage
    csrf.ts                   origem e cabecalho customizado
    login-rate-limit.ts       limites de tentativas persistentes
    error-handler.ts          resposta padronizada de erros
```

| Metodo | Endpoint | Resultado |
| --- | --- | --- |
| POST | /api/auth/register | Recebe `{ name, email, password }`; cria conta e sessao, responde 201 com `{ user, expiresAt }` e cookie |
| POST | /api/auth/login | Recebe `{ email, password }`; responde `{ user, expiresAt }` e cookie |
| GET | /api/auth/me | Consulta a sessao; responde 401 se ausente ou expirada |
| POST | /api/auth/logout | Revoga a sessao e apaga o cookie; responde 204 |
| POST | /api/users/me/avatar | Recebe os bytes da foto, autentica o usuario e responde `{ user }` com `avatarUrl` |
| GET | /api/events | Catalogo publico da home; `q`, `genre`, `page`, `pageSize` |
| GET | /api/events/:id | Detalhes com `content`; exige sessao, rascunhos somente admin |
| GET | /api/events/public/:reference | Pagina publica de evento publicado, por slug ou ID; rascunhos e arquivados respondem 404 |
| GET | /api/events/manage | Lista administrativa, incluindo rascunhos e encerrados |
| POST | /api/events | Admin cria metadados de um rascunho, responde 201 com `{ event }` |
| PATCH | /api/events/:id | Admin atualiza todos os metadados, responde `{ event }` |
| DELETE | /api/events/:id | Admin arquiva o evento, responde 204 |
| POST | /api/events/:id/banner | Admin envia JPG/PNG/WebP binario e publica o evento apos sucesso |

O cadastro exige nome entre 2 e 100 caracteres, e-mail valido e senha entre 8 e 128 caracteres. E-mails sao normalizados e unicos; duplicados respondem 409 (`EMAIL_IN_USE`), sem alterar a conta existente. Conta e sessao sao criadas na mesma transacao. Login e cadastro possuem limites de tentativas independentes e compartilham o limite de operacoes Argon2 simultaneas.

Fotos de perfil: JPG, PNG e WebP sem animacao, ate 25 MB e 100 megapixels. O corpo do upload e binario, com o `Content-Type` da imagem; nao e JSON ou multipart. Sharp decodifica a imagem, aplica orientacao, recorta para 512x512 e gera WebP sem os metadados originais. Avisos de leitura nao criticos sao tolerados; arquivos incompletos ou invalidos respondem 400 (`INVALID_IMAGE`), enquanto excesso de resolucao responde 413 (`IMAGE_RESOLUTION_TOO_LARGE`). O frontend mostra previa e estado de envio; o avatar atualizado aparece na conta e nos menus, com sincronizacao entre abas. Login, cadastro e `/api/auth/me` incluem `avatarUrl` (null antes da primeira foto).

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_APIKEY` e `CLOUDINARY_APISECRET` apenas no `.env` do Backend. Tambem sao aceitos `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` ou a URL completa em `CLOUDINARY_URL`. A chave precisa permitir criar e excluir arquivos. Nenhum segredo e enviado ao navegador. Arquivos ficam em `reservai/avatars/<userId>/<UUID>` e seus metadados em `files`; `users.avatar_file_id` vincula a foto atual. A troca da foto atualiza o SQLite em uma transacao e enfileira a anterior em `file_cleanup_jobs`. Remocoes falhas sao repetidas a cada 30 segundos e na inicializacao. Falhas de upload preservam a foto anterior; logout ou expiracao durante o envio impedem a atualizacao do perfil.

O frontend usa o proxy do Vite, `credentials: include` e `X-Requested-With: Reservai`. Requisicoes POST, PATCH e DELETE devem conter uma origem listada em `APP_ORIGINS`. Nao ha CORS permissivo. A cookie `reservai_session` e HttpOnly, SameSite=Lax e Secure em producao; dura sete dias. Somente o hash SHA-256 do token aleatorio fica no SQLite. Um novo login ou cadastro no mesmo navegador revoga a sessao anterior. Logout e expiracao tambem encerram o WebSocket correspondente.

Em producao: use HTTPS, configure `APP_ORIGINS` com a origem real, `NODE_ENV=production` e `SEED_ON_START=false`. O seed automatico ja vem desativado por padrao em producao. Encaminhe `/api` e `/ws` pela mesma origem do frontend. O servidor escuta em 127.0.0.1 por padrao; configure `HOST` se necessario. Os limites usam o endereco do socket, sem confiar em `X-Forwarded-For`; atras de um proxy, o limite por IP sera compartilhado pelos visitantes desse proxy.

`yarn test` compila e executa testes de integracao em um SQLite temporario, cobrindo seed, cadastro, validacao, duplicidade e concorrencia, senhas, cookies, CSRF, rotacao, expiracao, reinicio, logout, limite de tentativas, WebSocket e fotos de perfil. Os testes de arquivos simulam o SDK do Cloudinary em processos isolados e nao usam as credenciais reais nem criam arquivos remotos. `yarn typecheck` valida os tipos.

O painel `/admin/eventos` cria, edita e remove eventos. Novas contas sempre recebem `user`; enviar `role` no cadastro nao promove a conta. Rafael e `user` e Gustavo e `admin`. As permissoes ficam em `modules/auth/permissions.ts`; o backend consulta o papel no SQLite a cada requisicao, inclusive depois de uploads demorados. Login, cadastro, consulta de sessao e troca de avatar retornam `user.role`. Apenas admin possui `events:manage`. Mutacoes exigem origem permitida e `X-Requested-With: Reservai`.

Metadados de criacao/edicao (JSON):

| Campo | Regra |
| --- | --- |
| title | 2 a 160 caracteres |
| genre | football, sport, pop, music ou other |
| location | 2 a 200 caracteres |
| content | Markdown, opcional, ate 20.000 caracteres; preserva quebras de linha |
| unitPriceCents | Inteiro entre 0 e 100.000.000; R$ 34,50 = 3450 |
| capacity | Inteiro entre 1 e 1.000.000; total de ingressos |
| startsAt, endsAt, expiresAt | Timestamps Unix em milissegundos; termino posterior ao inicio, prazo de reserva ate o inicio |

O preco e armazenado como inteiro no SQLite, nunca como valor monetario de ponto flutuante. O formulario aceita 10, 20, 34,50 ou 34.50 e converte as partes para centavos. A criacao exige prazo futuro; edicoes podem manter eventos encerrados. Capacidade nao pode ficar abaixo de `reservedCount`. A resposta inclui `slug`, `available`, `bannerUrl` e `status` (draft, open, sold_out ou expired). `content` aparece apenas nos detalhes, nunca na listagem/card da home. A pagina e a previa do formulario usam `react-markdown`, `remark-gfm` e `remark-breaks`: titulos, negrito, listas, links, tabelas e quebras de linha. HTML bruto e ignorado; os URLs usam a validacao padrao do renderer. O conteudo e armazenado em Markdown, sem converter para HTML no banco.

A migration 005 atribui URLs unicas aos eventos existentes, incluindo `/eventos/spfc-vitoria`, `/eventos/spfc-vasco` e `/eventos/noite-pop`. Copia os textos originais (descricao e lista Antes de ir) para o conteudo vazio dos dois jogos. Conteudo ja editado, titulo, preco, capacidade, datas, imagens locais, arquivos enviados e arquivamento sao preservados. O seed cria os mesmos slugs e textos em bancos novos. Repetir `yarn seed` nao sobrescreve edicoes, inclusive conteudo apagado intencionalmente depois da migracao.

Eventos novos recebem slug derivado do titulo com ID como sufixo. O slug permanece estavel ao editar o titulo; o ID inteiro continua sendo usado no CRUD e nos uploads. A pagina publica tambem aceita acesso por ID. Publicados encerrados ou esgotados podem ser consultados diretamente e exibem a compra desabilitada. Rascunhos continuam visiveis apenas pela API administrativa autenticada.

Listas retornam `{ items, total, page, pageSize, totalPages }`, ordenadas por `startsAt` e `id`, com busca literal por titulo (`q`) e filtro de categoria (`genre`). `pageSize` aceita 1 a 50 (padrao 6). O catalogo publico mostra somente publicados com inicio e prazo de reserva futuros. A consulta individual exige sessao e permite consultar publicados encerrados; admin tambem pode consultar rascunhos. A listagem administrativa inclui rascunhos e encerrados. Exclusao arquiva: o historico e o banner sao mantidos, e o seed nao ressuscita eventos removidos.

O seed cria tres eventos futuros uma unica vez, incluindo o evento Pop com capacidade 2. Preserva edicoes, arquivos e datas existentes. Novos eventos permanecem em rascunho ate concluir o banner; falhas de envio permitem repetir a operacao no mesmo evento. Banners aceitam JPG, PNG e WebP sem animacao, ate 25 MB e 100 megapixels; o corpo e binario. Sharp orienta e gera WebP com ate 1920x1280, preservando proporcao e removendo metadados. Arquivos ficam em `reservai/banners/<eventId>/<UUID>`. Substituicoes reutilizam a fila persistente de limpeza; falhas preservam o banner anterior. As credenciais sao as mesmas do upload de avatar.

Os testes de eventos cobrem RBAC, seed idempotente, valores em centavos, conteudo, paginacao, filtros, datas, capacidade, arquivamento e ciclo de vida de banners, com SQLite temporario e Cloudinary simulado.

A pagina individual do evento consulta a API publica, com banner, titulo, categoria, local, datas, preco, capacidade, prazo e conteudo atuais. O total e calculado em centavos inteiros (preco unitario x quantidade). A quantidade respeita a disponibilidade e o limite de 4 por compra exibido no conteudo original. Visitantes podem consultar o evento; o botao de compra exige login. Os antigos precos de setores fixos foram substituidos pelo preco unitario do banco. A efetivacao de compra/reserva de ingressos ainda sera implementada. Recuperacao de senha nao faz parte dos planos do projeto.

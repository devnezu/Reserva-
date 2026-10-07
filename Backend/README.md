# Backend Reservaí

HTTP nativo do Node + TypeScript + SQLite. Implementa cadastro, autenticacao por e-mail e senha, sessoes persistentes e WebSocket autenticado.

```sh
yarn install
yarn dev
```

Em desenvolvimento, a inicializacao executa as migrations e cria os dois usuarios de demonstracao antes de aceitar requisicoes. O seed e idempotente: nao duplica contas nem altera senhas existentes.

| Nome | E-mail |
| --- | --- |
| Rafael | dry1@reservai.com |
| Gustavo | dry2@reservai.com |

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
    seed.ts                   usuarios de demonstracao
    seed-cli.ts               comando yarn seed
  modules/auth/
    routes.ts                 endpoints
    controller.ts             entrada e resposta HTTP
    service.ts                login, criacao e revogacao de sessoes
    repository.ts             consultas SQL parametrizadas
    schemas.ts                validacao do login
    password.ts               Argon2id
    cookies.ts                cookie da sessao
  modules/files/
    routes.ts                 upload autenticado de avatar
    controller.ts             autenticacao e limites de envio
    image.ts                  validacao e preparo da imagem com Sharp
    service.ts                upload, troca da foto e limpeza
    repository.ts             metadados dos arquivos no SQLite
  storage/cloudinary.ts       adapter de upload e remocao no Cloudinary
  middlewares/
    require-auth.ts           protecao de endpoints
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

O cadastro exige nome entre 2 e 100 caracteres, e-mail valido e senha entre 8 e 128 caracteres. E-mails sao normalizados e unicos; duplicados respondem 409 (`EMAIL_IN_USE`), sem alterar a conta existente. Conta e sessao sao criadas na mesma transacao. Login e cadastro possuem limites de tentativas independentes e compartilham o limite de operacoes Argon2 simultaneas.

Fotos de perfil: JPG, PNG e WebP sem animacao, ate 25 MB e 100 megapixels. O corpo do upload e binario, com o `Content-Type` da imagem; nao e JSON ou multipart. Sharp decodifica a imagem, aplica orientacao, recorta para 512x512 e gera WebP sem os metadados originais. Avisos de leitura nao criticos sao tolerados; arquivos incompletos ou invalidos respondem 400 (`INVALID_IMAGE`), enquanto excesso de resolucao responde 413 (`IMAGE_RESOLUTION_TOO_LARGE`). O frontend mostra previa e estado de envio; o avatar atualizado aparece na conta e nos menus, com sincronizacao entre abas. Login, cadastro e `/api/auth/me` incluem `avatarUrl` (null antes da primeira foto).

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_APIKEY` e `CLOUDINARY_APISECRET` apenas no `.env` do Backend. Tambem sao aceitos `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` ou a URL completa em `CLOUDINARY_URL`. A chave precisa permitir criar e excluir arquivos. Nenhum segredo e enviado ao navegador. Arquivos ficam em `reservai/avatars/<userId>/<UUID>` e seus metadados em `files`; `users.avatar_file_id` vincula a foto atual. A troca da foto atualiza o SQLite em uma transacao e enfileira a anterior em `file_cleanup_jobs`. Remocoes falhas sao repetidas a cada 30 segundos e na inicializacao. Falhas de upload preservam a foto anterior; logout ou expiracao durante o envio impedem a atualizacao do perfil.

O frontend usa o proxy do Vite, `credentials: include` e `X-Requested-With: Reservai`. Requisicoes POST devem conter uma origem listada em `APP_ORIGINS`. Nao ha CORS permissivo. A cookie `reservai_session` e HttpOnly, SameSite=Lax e Secure em producao; dura sete dias. Somente o hash SHA-256 do token aleatorio fica no SQLite. Um novo login ou cadastro no mesmo navegador revoga a sessao anterior. Logout e expiracao tambem encerram o WebSocket correspondente.

Em producao: use HTTPS, configure `APP_ORIGINS` com a origem real, `NODE_ENV=production` e `SEED_ON_START=false`. O seed automatico ja vem desativado por padrao em producao. Encaminhe `/api` e `/ws` pela mesma origem do frontend. O servidor escuta em 127.0.0.1 por padrao; configure `HOST` se necessario. Os limites usam o endereco do socket, sem confiar em `X-Forwarded-For`; atras de um proxy, o limite por IP sera compartilhado pelos visitantes desse proxy.

`yarn test` compila e executa testes de integracao em um SQLite temporario, cobrindo seed, cadastro, validacao, duplicidade e concorrencia, senhas, cookies, CSRF, rotacao, expiracao, reinicio, logout, limite de tentativas, WebSocket e fotos de perfil. Os testes de arquivos simulam o SDK do Cloudinary em processos isolados e nao usam as credenciais reais nem criam arquivos remotos. `yarn typecheck` valida os tipos.

Eventos e reservas ficam para as proximas etapas. Recuperacao de senha nao faz parte dos planos do projeto.

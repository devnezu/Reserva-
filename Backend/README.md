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

O cadastro exige nome entre 2 e 100 caracteres, e-mail valido e senha entre 8 e 128 caracteres. E-mails sao normalizados e unicos; duplicados respondem 409 (`EMAIL_IN_USE`), sem alterar a conta existente. Conta e sessao sao criadas na mesma transacao. Login e cadastro possuem limites de tentativas independentes e compartilham o limite de operacoes Argon2 simultaneas.

O frontend usa o proxy do Vite, `credentials: include` e `X-Requested-With: Reservai`. Requisicoes POST devem conter uma origem listada em `APP_ORIGINS`. Nao ha CORS permissivo. A cookie `reservai_session` e HttpOnly, SameSite=Lax e Secure em producao; dura sete dias. Somente o hash SHA-256 do token aleatorio fica no SQLite. Um novo login ou cadastro no mesmo navegador revoga a sessao anterior. Logout e expiracao tambem encerram o WebSocket correspondente.

Em producao: use HTTPS, configure `APP_ORIGINS` com a origem real, `NODE_ENV=production` e `SEED_ON_START=false`. O seed automatico ja vem desativado por padrao em producao. Encaminhe `/api` e `/ws` pela mesma origem do frontend. O servidor escuta em 127.0.0.1 por padrao; configure `HOST` se necessario. Os limites usam o endereco do socket, sem confiar em `X-Forwarded-For`; atras de um proxy, o limite por IP sera compartilhado pelos visitantes desse proxy.

`yarn test` compila e executa testes de integracao em um SQLite temporario, cobrindo seed, cadastro, validacao, duplicidade e concorrencia, senhas, cookies, CSRF, rotacao, expiracao, reinicio, logout, limite de tentativas e WebSocket. `yarn typecheck` valida os tipos.

Eventos e reservas ficam para as proximas etapas. Recuperacao de senha nao faz parte dos planos do projeto.

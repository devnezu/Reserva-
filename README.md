# Projeto

Estrutura inicial, somente Hello World.

- Frontend: React, TypeScript, Vite, Tailwind CSS v4 e Hugeicons Free.
- Backend: TypeScript, HTTP nativo do Node, WebSocket (`ws`) e SQLite (`better-sqlite3`).

## Executar

Yarn 1.22.22 instalado e ativado via Corepack. Cada pasta tem seu proprio `package.json`, `yarn.lock` e dependencias.

Em um terminal, na raiz:

```sh
cd Backend
yarn install
yarn dev
```

Em outro terminal, na raiz:

```sh
cd Frontend
yarn install
yarn dev
```

Frontend: http://localhost:5173. A home apresenta o projeto e direciona a compra de ingressos para `/acesso`. A pagina de acesso alterna cadastro e login com Motion. O Hello World permanece em `/helloworld`.

A interface utiliza componentes shadcn/ui (`Button` e `Input`), Hugeicons e Tailwind v4. Os formularios possuem validacao nativa, mas autenticacao, cadastro de usuarios e compra de ingressos ainda nao estao conectados ao backend. A marca e Reservaí. A logo fornecida em `Frontend/public` foi vetorizada em `src/components/brand-mark.ts`, com acento agudo no i final.

O preloader roda uma vez por carregamento do aplicativo, desenha a logo vetorizada em `src/components/brand-mark.ts`, preenche de baixo para cima e revela a pagina com ondas vermelhas. O percentual e uma animacao de progresso, nao uma medicao de bytes. Aguarda o evento `load` e as fontes, com limite de 15 segundos para recursos parados. A duracao minima normal e de aproximadamente 4,75 segundos; com movimento reduzido, os atrasos visuais sao dispensados. A navegacao entre rotas nao repete o preloader.

Classes reutilizaveis: `animate-marquee`, `animate-mark-draw`, `animate-mark-ink`, `animate-mark-head`, `animate-result-in`, `animate-admin-drawer-in` e `scrollbar-brand`. As fontes Figtree e Plus Jakarta Sans e o tema existente foram mantidos.

HTTP: http://127.0.0.1:3001/api/hello

WebSocket: ws://127.0.0.1:3001/ws

O Vite encaminha `/api` e `/ws` ao backend durante o desenvolvimento. Os clientes iniciais ficam em `Frontend/src/api/index.ts`.

```text
Backend/
  data/
  src/
    database.ts
    server.ts
Frontend/
  src/
    App.tsx
    main.tsx
    hooks/
    context/
    api/
    i18n/
```

`hooks`, `context` e `i18n` ficam reservados para o desenvolvimento futuro. Nenhuma biblioteca de tradução foi adicionada.

O SQLite cria `Backend/data/app.sqlite` na primeira execução, sem tabelas de negócio. Para personalizar o backend, copie `Backend/.env.example` para `Backend/.env`. O `.env` existente na raiz foi preservado e não é carregado automaticamente.

Execute `yarn build` dentro de cada pasta para compilar. Use `yarn lint` no Frontend e `yarn typecheck` no Backend para verificar o codigo. Apos compilar o Backend, `yarn start` inicia seu servidor. O deploy do frontend e o proxy de producao ainda devem ser definidos.

Node verificado: 20.20.2. O índice oficial consultado indicou 26.10.0 como Current e 24.21.0 como LTS. O ambiente instalado foi mantido. O driver SQLite usa a linha 11.10, compatível com esse Node e com binário disponível para Windows.

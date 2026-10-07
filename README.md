# Projeto

Reservaí: interface de ingressos com autenticacao por e-mail e senha e sessoes persistentes.

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

Frontend: http://localhost:5173. Na home, os links de ingressos levam visitantes para `/acesso`; usuarios autenticados permanecem na Home e rolam ate a secao de proximos jogos. A pagina de acesso alterna cadastro e login com Motion. Login e cadastro redirecionam para a Home. O Hello World permanece em `/helloworld`.

A interface utiliza componentes shadcn/ui (`Button` e `Input`), Hugeicons e Tailwind v4. Login e cadastro estao conectados ao backend, com restauracao de sessao ao recarregar, sincronizacao entre abas, logout e protecao de `/conta`. A animacao de alternancia foi preservada. Compra de ingressos ainda nao esta conectada ao backend. Recuperacao de senha nao faz parte dos planos do projeto. A marca e Reservaí. A logo fornecida em `Frontend/public` foi vetorizada em `src/components/brand-mark.ts`, com acento agudo no i final.

O backend executa migrations e o seed dos usuarios Rafael (`dry1@reservai.com`) e Gustavo (`dry2@reservai.com`) ao iniciar em desenvolvimento. Tambem e possivel executar `yarn seed` na pasta Backend. Veja `Backend/README.md` para arquitetura, endpoints e configuracao de producao.

Na tela `/conta`, o usuario pode adicionar ou trocar sua foto de perfil (JPG, PNG ou WebP de ate 25 MB). O backend prepara a imagem e envia ao Cloudinary, mantendo o vinculo e os metadados no SQLite. O avatar e restaurado ao entrar e sincronizado entre abas. As credenciais do Cloudinary ficam apenas no `.env` do Backend; veja `Backend/.env.example`.

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

`hooks` e `context` gerenciam a autenticacao e a sessao do frontend. `i18n` fica reservado para o desenvolvimento futuro; nenhuma biblioteca de tradução foi adicionada.

O SQLite cria `Backend/data/app.sqlite` na primeira execução, com tabelas de usuarios, sessoes, limites de tentativas e controle de migrations. Para personalizar o backend, copie `Backend/.env.example` para `Backend/.env`. O `.env` existente na raiz foi preservado e não é carregado automaticamente.

Execute `yarn build` dentro de cada pasta para compilar. Use `yarn lint` no Frontend e `yarn typecheck` no Backend para verificar o codigo. Apos compilar o Backend, `yarn start` inicia seu servidor. O deploy do frontend e o proxy de producao ainda devem ser definidos.

Node verificado: 20.20.2. O índice oficial consultado indicou 26.10.0 como Current e 24.21.0 como LTS. O ambiente instalado foi mantido. O driver SQLite usa a linha 11.10, compatível com esse Node e com binário disponível para Windows.

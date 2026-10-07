# Projeto

Reservaí: interface de ingressos com autenticacao por e-mail e senha, sessoes persistentes e reservas com confirmacao simulada.

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

Frontend: http://localhost:5173. A pagina de acesso alterna cadastro e login com Motion. Login e cadastro redirecionam para a Home. O Hello World permanece em `/helloworld`. Os cards e o destaque da home abrem a pagina dinamica do evento. Visitantes podem consultar as informacoes; o botao de compra leva ao login quando necessario.

A interface utiliza componentes shadcn/ui (`Button` e `Input`), Hugeicons e Tailwind v4. Login e cadastro estao conectados ao backend, com restauracao de sessao ao recarregar, sincronizacao entre abas, logout e protecao de `/conta` e `/reservas/:id`. A animacao de alternancia foi preservada. Reservas e compra simulada estao conectadas ao backend. Recuperacao de senha nao faz parte dos planos do projeto. A marca e Reservaí. A logo fornecida em `Frontend/public` foi vetorizada em `src/components/brand-mark.ts`, com acento agudo no i final.

O backend executa migrations e o seed dos usuarios Rafael (`dry1@reservai.com`, papel `user`) e Gustavo (`dry2@reservai.com`, papel `admin`) ao iniciar em desenvolvimento. Tambem cria tres eventos futuros, um deles com capacidade de apenas 2 ingressos. O seed nao sobrescreve contas ou eventos existentes. Tambem e possivel executar `yarn seed` na pasta Backend. Veja `Backend/README.md` para arquitetura, endpoints e configuracao de producao.

Os proximos jogos da home usam o catalogo SQLite, com busca por titulo, filtro de categoria e paginacao no servidor. Precos ficam em centavos inteiros (R$ 34,50 = 3450); cada card exibe banner, titulo, local, data, preco, disponibilidade e prazo de reserva. O SVG do Brasileirao aparece somente em Futebol. Gustavo pode acessar `/admin/eventos` pelo menu ou pela conta e cadastrar/editar/arquivar eventos, com banner no Cloudinary de ate 25 MB. O campo Conteudo aceita Markdown, possui previa no formulario e aparece somente na pagina do evento.

Paginas como `/eventos/spfc-vitoria` consultam os valores atuais no banco, mantendo as imagens originais. A migration 005 e o seed levam os textos antes fixos (descricao e Antes de ir) para o SQLite, preservando edicoes existentes. Os slugs sao unicos e estaveis ao editar titulos. O total de ingressos e calculado em centavos e a selecao respeita a disponibilidade; eventos encerrados e esgotados exibem a reserva desabilitada.

A migration 006 adiciona reservas, idempotencia e notificacoes persistentes. O usuario pode reservar de 1 a 4 ingressos por 5 minutos, confirmar uma compra simulada ou cancelar. `/reservas/:id` mostra o resumo e a contagem regressiva; `/conta?secao=eventos` lista Minhas reservas. O SQLite valida a disponibilidade e cria a reserva na mesma transacao, protegendo a disputa pelos ultimos ingressos. Confirmacao repetida nao duplica a ocupacao; cancelamento e expiracao liberam capacidade. HTTP e WS retornam resultados individuais e atualizacoes de disponibilidade, com recuperacao apos desconexao. Veja [o contrato e o roteiro de teste](Backend/docs/reservations.md).

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

Node verificado: 20.20.2. O índice oficial consultado indicou 26.10.0 como Current e 24.21.0 como LTS. O ambiente instalado foi mantido. O driver `better-sqlite3` esta fixado em 12.8.0, com SQLite 3.51.3 e binario Windows compativel com esse Node. Essa versao inclui a correcao da falha WAL-reset em concorrencia entre conexoes.

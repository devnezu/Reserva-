# Reservaí

Aplicação de reserva de ingressos: o usuário consulta eventos, reserva de 1 a 4 ingressos por 5 minutos e confirma uma compra simulada. Quando duas pessoas disputam os últimos ingressos, o servidor respeita a capacidade do evento e informa quem conseguiu.

Projeto desenvolvido como desafio técnico de React + Node.js.

- [Decisões e limites](DECISOES.md): estrutura, autenticação, concorrência, expiração, o que funciona e o que ficou de fora.
- [Contrato da API](docs/API.md): rotas, exemplos de requisição e resposta, códigos de erro.
- [Uso de IA](AI_USAGE.md): ferramentas, exemplos de interação e tempo de trabalho.
- [Segurança](docs/SEGURANCA.md): revisão de segurança, correções aplicadas e limites de uso.

## Stack e versões

| Parte | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend | Node.js com o módulo HTTP nativo (sem framework), TypeScript 7 |
| Banco | SQLite, pelo driver `better-sqlite3` 12.8 (SQL direto, sem ORM) |
| Senhas | Argon2id (`argon2` 0.44) |
| Testes | `node:test` no backend; Vitest 4 e Testing Library no frontend |

As versões exatas de todas as dependências estão nos arquivos `yarn.lock` de cada pasta.

## Pré-requisitos

- **Node.js 20** (verificado com 20.20.2).
- **Yarn 1.22** (`npm install -g yarn`, ou `corepack enable`).

Não é preciso instalar banco de dados: o SQLite é um arquivo criado pelo próprio backend.

## Instalação

O repositório tem dois projetos independentes, cada um com seu `package.json` e `yarn.lock`.

```sh
cd Backend
yarn install

cd ../Frontend
yarn install
```

## Configuração do ambiente

O backend roda sem nenhuma configuração. Para personalizar, copie o exemplo:

```sh
cd Backend
cp .env.example .env
```

| Variável | Padrão | Para que serve |
|---|---|---|
| `PORT` | `3001` | Porta do backend |
| `DATABASE_PATH` | `./data/app.sqlite` | Arquivo do banco |
| `APP_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Origens autorizadas a chamar a API |
| `SEED_ON_START` | `true` fora de produção | Roda o seed ao iniciar. Em produção o seed e as contas de demonstração são recusados |
| `TRUSTED_PROXIES` | vazio | IPs de proxy confiáveis, só se houver proxy na frente |
| `CLOUDINARY_*` | vazio | Opcional. Só para o envio de foto de perfil e de banner |

O frontend não tem variáveis de ambiente: em desenvolvimento, o Vite encaminha `/api` e `/ws` para `http://127.0.0.1:3001`.

Deploy não faz parte do escopo. Se for publicar: use HTTPS, defina `NODE_ENV=production` (o cookie passa a ser `Secure` e o seed automático é desligado), configure `APP_ORIGINS` com a origem real do frontend e sirva `/api` e `/ws` pela mesma origem dele. O servidor escuta em `127.0.0.1`; ajuste `HOST` se precisar.

## Banco, migrations e seed

- **Migrations:** ficam em `Backend/src/database/migrations` e são aplicadas automaticamente, em ordem e uma única vez, sempre que o backend inicia. A tabela `schema_migrations` registra as já aplicadas.
- **Seed:** roda ao iniciar em desenvolvimento e também pelo comando abaixo. Pode ser executado quantas vezes for preciso sem duplicar nem sobrescrever registros.

```sh
cd Backend
yarn seed
```

O seed cria três usuários e três eventos futuros:

| Evento | Início | Preço | Capacidade |
|---|---|---|---|
| São Paulo FC x EC Vitória | em 3 dias | R$ 34,50 | 500 |
| São Paulo FC x Vasco da Gama | em 10 dias | R$ 20,00 | 300 |
| Noite Pop — Últimos 2 ingressos | em 17 dias | R$ 10,00 | 2 |

Para recomeçar do zero, pare o backend e apague os arquivos `Backend/data/app.sqlite*`.

## Contas de demonstração

| Nome | E-mail | Senha | Papel |
|---|---|---|---|
| Rafael | `dry1@reservai.com` | `dryedemais123` | usuário |
| Gustavo | `dry2@reservai.com` | `dryedemais321` | administrador |
| Member | `dry3@reservai.com` | `dryedemais321` | usuário |

São dados fictícios, criados pelo seed.

## Execução

Em dois terminais:

```sh
cd Backend
yarn dev
```

```sh
cd Frontend
yarn dev
```

- Aplicação: http://localhost:5173
- API: http://127.0.0.1:3001

Para a disputa pelos últimos ingressos, entre com as duas contas em navegadores diferentes (ou em uma janela anônima) e reserve 2 ingressos da "Noite Pop" nas duas: uma reserva é criada e a outra recebe o aviso de que não há ingressos suficientes.

## Testes

```sh
cd Backend
yarn test
```

Compila o backend e roda 70 testes de integração em bancos SQLite temporários, sem tocar no banco de desenvolvimento.

```sh
cd Frontend
yarn test
```

Roda 5 testes de interface: o conflito ao reservar e casos de sessão e de repetição de tentativa.

Onde está cada cenário obrigatório:

| Cenário | Arquivo |
|---|---|
| 1. Fluxo e repetição da confirmação | `Backend/tests/reservations.test.mjs` |
| 2. Concorrência com capacidade 2 | `Backend/tests/reservations.test.mjs` |
| 3. Expiração no limite exato e depois | `Backend/tests/reservation-boundaries.test.mjs` |
| 4. Cancelamento | `Backend/tests/reservations.test.mjs` |
| 5. Acesso e propriedade | `Backend/tests/reservations.test.mjs` e `Backend/tests/auth.test.mjs` |
| 6. Interface diante de um 409 | `Frontend/src/pages/Event.conflict.test.tsx` |

Outras verificações: `yarn typecheck` no backend; `yarn lint` e `yarn build` no frontend.

## Estrutura

```text
Backend/
  src/
    server.ts            inicialização: migrations, seed, servidor HTTP e WebSocket
    app.ts               roteamento e tratamento de erros
    config/              variáveis de ambiente
    database/            conexão, migrations e seed
    middlewares/         autenticação, administrador, origem, erros, limite de tentativas
    modules/
      auth/              login, cadastro, sessão e senhas
      events/            catálogo, administração e cálculo de disponibilidade
      reservations/      criação, consulta, confirmação, cancelamento e expiração
      files/             envio de imagens
    realtime/            notificações por WebSocket
  tests/                 testes de integração
Frontend/
  src/
    pages/               home, acesso, evento, conta, reserva, administração, 404
    components/          interface, organizada por área
    api/                 chamadas HTTP
    context/ e hooks/    sessão, tempo real e carregamento de dados
docs/API.md              contrato da API
```

## Telas

| Endereço | Tela | Exige login |
|---|---|---|
| `/` | Home com o catálogo, busca e categorias | não |
| `/acesso` | Login e cadastro | não |
| `/eventos/:slug` | Detalhe do evento e reserva | não para ver; sim para reservar |
| `/reservas/:id` | Reserva: contagem regressiva, confirmar, cancelar | sim |
| `/conta` | Meus dados | sim |
| `/conta?secao=eventos` | Minhas reservas | sim |
| `/admin/eventos` | Gerenciamento de eventos | administrador |

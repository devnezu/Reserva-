# Contrato da API

API HTTP do Reservaí. Base em desenvolvimento: `http://127.0.0.1:3001`. O frontend acessa as mesmas rotas por `http://localhost:5173/api`, via proxy do Vite.

## Convenções

- **Formato:** JSON em UTF-8, nas requisições e nas respostas.
- **Datas:** inteiros em milissegundos desde a época Unix, em UTC (`startsAt`, `expiresAt`, `serverTime`). A interface formata para o fuso de São Paulo.
- **Dinheiro:** inteiros em centavos (`unitPriceCents`, `totalCents`).
- **Autenticação:** cookie de sessão `reservai_session`, enviado pelo navegador. Não há token em cabeçalho.
- **Requisições que alteram dados** (`POST`, `PATCH`, `DELETE`) precisam de dois cabeçalhos, ou recebem `403 INVALID_ORIGIN`:
  - `Origin` igual a uma origem permitida em `APP_ORIGINS`;
  - `X-Requested-With: Reservai`.
- **Erros:** sempre `{ "message": "...", "code": "..." }`, sem stack trace.

| Status | Quando |
|---|---|
| 400 | Entrada inválida |
| 401 | Sessão ausente, inválida ou expirada |
| 403 | Origem não permitida, ou ação exclusiva de administrador |
| 404 | Recurso inexistente, ou reserva de outro usuário |
| 409 | Capacidade insuficiente, evento fechado para reserva ou estado incompatível |
| 413 | Arquivo acima do limite |
| 429 | Muitas tentativas |
| 503 | Serviço momentaneamente ocupado; tente de novo |

## Acesso

| Método | Rota | Sessão | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | não | Entra com e-mail e senha |
| GET | `/api/auth/me` | sim | Consulta a identidade da sessão |
| POST | `/api/auth/logout` | sim | Encerra a sessão |
| POST | `/api/auth/register` | não | Cria uma conta (extra ao escopo) |

### Login

```http
POST /api/auth/login
Origin: http://localhost:5173
X-Requested-With: Reservai
Content-Type: application/json

{ "email": "dry1@reservai.com", "password": "dryedemais123" }
```

```http
HTTP/1.1 200 OK
Set-Cookie: reservai_session=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800

{
  "user": { "id": 1, "name": "Rafael", "email": "dry1@reservai.com", "avatarUrl": null, "role": "user" },
  "expiresAt": 1792004079484
}
```

Credenciais erradas respondem `401`:

```json
{ "message": "E-mail ou senha incorretos.", "code": "INVALID_CREDENTIALS" }
```

Há limite de tentativas por IP (30) e por e-mail (10) a cada 15 minutos; ao estourar, `429 RATE_LIMITED`.

### Identidade

`GET /api/auth/me` devolve o mesmo corpo do login. Sem sessão válida:

```json
{ "message": "Sua sessão expirou. Entre novamente.", "code": "UNAUTHENTICATED" }
```

### Logout

`POST /api/auth/logout` responde `204` sem corpo, apaga a sessão no banco e o cookie. Uma chamada seguinte a `/api/auth/me` com o cookie antigo responde `401`.

### Cadastro

`POST /api/auth/register` recebe `{ "name", "email", "password" }` (nome de 2 a 100 caracteres, senha de 8 a 128) e responde `201` com o mesmo corpo do login, já com sessão iniciada.

- Toda conta nova recebe o papel `user`; enviar `role` no corpo não tem efeito.
- E-mail já cadastrado responde `409 EMAIL_IN_USE`, sem alterar a conta existente.

## Eventos

| Método | Rota | Sessão | Descrição |
|---|---|---|---|
| GET | `/api/events` | não | Lista eventos publicados e ainda abertos, com busca e paginação |
| GET | `/api/events/public/:slug` | não | Detalhe de um evento publicado, com conteúdo |
| GET | `/api/events/:id` | sim | Detalhe por ID |
| GET | `/api/events/manage` | admin | Lista para gerenciamento, inclui rascunhos e encerrados |
| POST | `/api/events` | admin | Cria evento |
| PATCH | `/api/events/:id` | admin | Edita evento |
| DELETE | `/api/events/:id` | admin | Arquiva evento |
| POST | `/api/events/:id/banner` | admin | Envia a imagem do evento |

A listagem e o detalhe públicos não exigem login; é uma decisão registrada em [DECISOES.md](../DECISOES.md). As rotas de administração são extras ao escopo.

### Listar

Parâmetros de `GET /api/events`:

| Parâmetro | Padrão | Regra |
|---|---|---|
| `page` | 1 | Inteiro a partir de 1 |
| `pageSize` | 6 | Inteiro de 1 a 50 |
| `q` | vazio | Trecho do título, até 160 caracteres; ignora maiúsculas e acentos |
| `genre` | vazio | `football`, `sport`, `pop`, `music` ou `other` |

A ordenação é sempre por `startsAt` crescente e, em empate, por `id`. Parâmetro inválido responde `400`.

```http
GET /api/events?q=vasco&page=1&pageSize=6
```

```json
{
  "items": [
    {
      "id": 2,
      "slug": "spfc-vasco",
      "title": "São Paulo FC x Vasco da Gama",
      "genre": "football",
      "location": "MorumBIS, São Paulo",
      "unitPriceCents": 2000,
      "capacity": 300,
      "reservedCount": 1,
      "available": 299,
      "startsAt": 1792251360000,
      "endsAt": 1792258560000,
      "expiresAt": 1792247760000,
      "bannerUrl": "/spfcxvasco.png",
      "status": "open"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 6,
  "totalPages": 1
}
```

- `available` é a disponibilidade efetiva: capacidade menos ingressos confirmados menos ingressos de reservas pendentes ainda válidas.
- `expiresAt` do evento é o prazo final para reservar, definido no cadastro do evento.
- `status` é `open`, `sold_out`, `expired` ou `draft`.

### Detalhe

`GET /api/events/public/spfc-vasco` responde `{ "event": { ... } }` com os mesmos campos da listagem mais `content`, o texto da página em Markdown. Evento inexistente, em rascunho ou arquivado responde `404`.

### Administração (extra)

`POST /api/events` e `PATCH /api/events/:id` recebem o evento completo em JSON:

| Campo | Regra |
|---|---|
| `title` | 2 a 160 caracteres |
| `genre` | `football`, `sport`, `pop`, `music` ou `other` |
| `location` | 2 a 200 caracteres |
| `content` | Markdown, opcional, até 20.000 caracteres |
| `unitPriceCents` | Inteiro de 0 a 100.000.000; R$ 34,50 é `3450` |
| `capacity` | Inteiro de 1 a 1.000.000 |
| `startsAt`, `endsAt`, `expiresAt` | Milissegundos em UTC; término depois do início; prazo de reserva até o início |

- Um evento novo nasce como rascunho e só é publicado quando o banner é enviado.
- Reduzir a capacidade abaixo do total já reservado responde `409`.
- `DELETE` arquiva o evento; ele sai do catálogo, mas continua no histórico de quem reservou.
- `POST /api/events/:id/banner` recebe os bytes da imagem no corpo, com o `Content-Type` da imagem (não é JSON nem formulário). Aceita JPG, PNG e WebP sem animação, até 25 MB.

## Reservas

Todas as rotas exigem sessão. A identidade vem sempre da sessão: `userId`, preço ou total enviados no corpo são ignorados.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/reservations` | Cria uma reserva |
| GET | `/api/reservations` | Lista as reservas do usuário autenticado |
| GET | `/api/reservations/:id` | Detalhe de uma reserva própria |
| POST | `/api/reservations/:id/confirm` | Confirma a compra simulada |
| POST | `/api/reservations/:id/cancel` | Cancela a reserva |

**Reserva de outro usuário:** consultar, confirmar ou cancelar responde `404 RESERVATION_NOT_FOUND`, idêntico ao de uma reserva que não existe, para não revelar que ela existe.

### Criar

Além dos cabeçalhos de origem, a criação exige `Idempotency-Key`: um identificador da tentativa, de 16 a 128 caracteres entre letras, números, `_` e `-`. Repetir a mesma chave com os mesmos dados devolve a mesma reserva, sem criar outra.

```http
POST /api/reservations
Origin: http://localhost:5173
X-Requested-With: Reservai
Idempotency-Key: 5a1c0c0e-6f1d-4b0e-9a57-3d1f0e2b7c44
Content-Type: application/json

{ "eventId": 2, "quantity": 1 }
```

```http
HTTP/1.1 201 Created

{
  "requestId": "5a1c0c0e-6f1d-4b0e-9a57-3d1f0e2b7c44",
  "serverTime": 1791398401697,
  "reservation": {
    "id": "bde1d89f-c530-4601-a6c6-f2168df2d276",
    "eventId": 2,
    "quantity": 1,
    "status": "PENDENTE",
    "unitPriceCents": 2000,
    "totalCents": 2000,
    "createdAt": 1791398401697,
    "updatedAt": 1791398401697,
    "expiresAt": 1791398701697,
    "confirmedAt": null,
    "cancelledAt": null,
    "version": 1,
    "event": {
      "id": 2,
      "slug": "spfc-vasco",
      "title": "São Paulo FC x Vasco da Gama",
      "location": "MorumBIS, São Paulo",
      "startsAt": 1792251360000,
      "bannerUrl": "/spfcxvasco.png"
    }
  }
}
```

- `expiresAt` é sempre `createdAt` mais 5 minutos, calculado no servidor.
- `serverTime` é a referência de horário para a contagem regressiva na interface.
- Repetir a requisição com a mesma chave responde `200` com a mesma reserva.

Recusas:

| Status | `code` | Situação |
|---|---|---|
| 400 | `INVALID_QUANTITY` | Quantidade zero, fracionária, não numérica ou acima de 4 |
| 400 | `INVALID_EVENT` | `eventId` ausente ou inválido |
| 400 | `INVALID_REQUEST_ID` | `Idempotency-Key` ausente ou fora do formato |
| 404 | `EVENT_NOT_FOUND` | Evento inexistente, em rascunho ou arquivado |
| 409 | `INSUFFICIENT_CAPACITY` | Não há ingressos suficientes |
| 409 | `EVENT_CLOSED` | O evento já começou ou o prazo de reserva encerrou |
| 409 | `IDEMPOTENCY_CONFLICT` | A mesma chave foi usada com outro evento ou quantidade |

```json
{ "message": "Escolha uma quantidade inteira entre 1 e 4 ingressos.", "code": "INVALID_QUANTITY" }
```

```json
{
  "requestId": "5a1c0c0e-6f1d-4b0e-9a57-3d1f0e2b7c44",
  "serverTime": 1791398401697,
  "code": "INSUFFICIENT_CAPACITY",
  "message": "Não há ingressos suficientes para essa quantidade. Outra pessoa pode ter reservado os últimos ingressos."
}
```

### Listar as próprias

`GET /api/reservations?page=1&pageSize=6` (`pageSize` de 1 a 50), da mais recente para a mais antiga:

```json
{
  "items": [ { "id": "bde1d89f-c530-4601-a6c6-f2168df2d276", "status": "CONFIRMADA", "...": "demais campos da reserva" } ],
  "total": 4,
  "page": 1,
  "pageSize": 6,
  "totalPages": 1,
  "serverTime": 1791399279708
}
```

O `status` é sempre o estado efetivo: uma reserva `PENDENTE` cujo prazo passou já aparece como `EXPIRADA`.

### Detalhe

`GET /api/reservations/:id` responde `{ "reservation": { ... }, "serverTime": ... }`.

### Confirmar e cancelar

```http
POST /api/reservations/bde1d89f-c530-4601-a6c6-f2168df2d276/confirm
Origin: http://localhost:5173
X-Requested-With: Reservai
```

```json
{
  "requestId": "0f6d5f0a-0f37-4f43-9a0c-0a2f6c1f7b11",
  "serverTime": 1791398414727,
  "reservation": { "id": "bde1d89f-c530-4601-a6c6-f2168df2d276", "status": "CONFIRMADA", "confirmedAt": 1791398414727, "version": 2, "...": "demais campos" }
}
```

| Operação | Estado atual | Resposta |
|---|---|---|
| Confirmar | `PENDENTE` e dentro do prazo | `200`, passa a `CONFIRMADA` |
| Confirmar | já `CONFIRMADA` | `200`, a mesma reserva, sem consumir capacidade de novo |
| Cancelar | `PENDENTE` e dentro do prazo | `200`, passa a `CANCELADA` e libera os ingressos |
| Confirmar ou cancelar | prazo vencido | `409 RESERVATION_EXPIRED` |
| Cancelar | `CONFIRMADA` ou já `CANCELADA` | `409 INVALID_TRANSITION` |
| Confirmar | `CANCELADA` | `409 INVALID_TRANSITION` |

A validade é verificada de novo dentro da mesma transação que grava a mudança, com o horário do servidor.

## Foto de perfil (extra)

`POST /api/users/me/avatar` recebe os bytes de uma imagem JPG, PNG ou WebP sem animação, de até 25 MB, com o `Content-Type` da imagem. O servidor recorta para 512×512, converte para WebP e envia ao Cloudinary; a resposta é `{ "user": { ... } }` com o novo `avatarUrl`.

Só funciona com as variáveis do Cloudinary configuradas; sem elas, responde com erro claro e o restante da aplicação segue normal. Formato não aceito responde `415`; arquivo grande demais, `413`; imagem ilegível, `400 INVALID_IMAGE`.

## Tempo real (extra)

`ws://127.0.0.1:3001/ws` (ou `/ws` pelo proxy do Vite) aceita conexões com sessão válida e de origem permitida. Logout ou expiração da sessão encerram a conexão.

| Mensagem | Quem recebe | Conteúdo |
|---|---|---|
| `reservation.result` | Só quem fez a tentativa | `requestId`, `success`, `httpStatus` e a reserva, ou o código e a mensagem da recusa |
| `reservation.updated` | Só o dono | A reserva atualizada e `serverTime` |
| `event.availability.updated` | Todos os conectados | `eventId`, `capacity`, `reservedCount`, `available` e `serverTime`, sem identificar o comprador |

Cada mensagem tem o formato `{ "id", "type", "data", "serverTime" }`. As notificações são gravadas no banco junto com a mudança que as originou; ao reconectar, o cliente envia `{ "type": "resume", "after": <último id recebido> }` e recebe as que perdeu.

É um complemento: todo o fluxo funciona só com HTTP, e a interface também consulta a API ao fim da contagem regressiva.

# Revisão de segurança — Reservaí

Data: 07/10/2026. Revisão do código local, testes existentes e reproduções em SQLite temporário. As alterações de outros colaboradores foram preservadas. Os achados abaixo descrevem o estado da auditoria inicial; as correções posteriores estão registradas a seguir.

## Situação após as correções

Todos os achados de alta (A1–A6) e média (M1–M7) receberam correções e testes de regressão. Os pontos de baixa criticidade e limites intencionais continuam descritos como recomendações/decisões de produto, fora do escopo solicitado para esta correção.

| Achados | Correção |
| --- | --- |
| A1 | Autorização revalidada após leitura do corpo e dentro da transação IMMEDIATE, inclusive em uploads |
| A2 | Taxas e cotas persistentes; limite de pendentes; retenção de recusas por sete dias; chaves de reservas criadas preservadas |
| A3 | Limites compartilhados por usuário/IP/global; replay único por conexão; frequência limitada; consulta da outbox filtra destinatário no SQL |
| A4 | Horário com piso persistente e avanço monotônico; expiração persistida na edição de capacidade; confirmação valida a invariante |
| A5 | Seed proibida em produção; sessões e login das contas demo negados nesse ambiente |
| A6 | Migrações não promovem por e-mail; registro de concessão de admin; provisionamento explícito por CLI |
| M1 | Notificações atuais e históricas de rascunhos filtradas |
| M2 | Um 401 leva à consulta da identidade atual; resposta antiga não encerra novo login |
| M3 | Falhas contadas por IP/e-mail, sucesso limpa falhas, senha correta não depende desse bloqueio; proxies confiáveis configuráveis |
| M4 | Orçamento único para avatar/banner e entre instâncias; taxa atômica; prazos de leitura e processamento de imagem |
| M5/M6 | Limpeza captura falhas da operação inteira; tentativas e backoff permitem avançar outros jobs |
| M7 | Arquivamento e vínculo conferidos na mesma transação; compensação não apaga arquivo já commitado |

Validação após as correções: **70 testes do Backend e 5 testes do Frontend passaram**, além de build e lint. Verificações de navegador mantiveram a sessão nova, impediram acesso à reserva alheia e passaram o fluxo de reserva/confirmação/QR Code e seus fallbacks. As migrations 007/008 foram aplicadas ao banco local, preservando as contagens: 3 usuários, 4 eventos, 6 reservas e 5 arquivos.

Detalhes de limites, configuração, arquivos alterados e contrato de retenção: [docs/SEGURANCA.md](docs/SEGURANCA.md).

## Resultado e alcance

Não foi confirmado um ataque crítico sem pré-condições no ambiente de demonstração. Foram encontrados problemas de autorização, disponibilidade, divulgação de metadados e consistência. A criticidade abaixo considera o impacto potencial em um serviço publicado; condições como banco legado, mudança de relógio ou uso da seed em produção estão explicitadas.

As reproduções usaram processos e bancos próprios em diretórios temporários. Nenhum teste de carga destrutivo foi feito no servidor do usuário. Não foram usados uploads reais nem credenciais reais do Cloudinary. Configuração efetiva de produção, proxy, TLS, permissões no provedor e histórico completo de segredos no Git não foram auditados.

Verificações: 55 testes do Backend e 1 teste do Frontend passaram; build e lint do Frontend passaram. `yarn audit --json` não reportou vulnerabilidades conhecidas nas dependências dos dois projetos nesta consulta. Esses resultados não cobrem as falhas reproduzidas abaixo nem garantem ausência de outras vulnerabilidades.

## Alta

### A1. CRUD administrativo aceita ações depois de revogar o acesso

- **Evidência:** `Backend/src/modules/events/routes.ts:43` e `:62`. POST e PATCH validam o administrador antes de `await readJson`, mas não revalidam depois. Reservas e uploads já possuem a segunda checagem.
- **Reprodução confirmada:** iniciar POST, enviar apenas o primeiro byte, fazer logout e concluir o corpo resulta em **201** e um evento gravado. Iniciar PATCH, trocar o papel de admin para user no banco temporário e concluir o corpo resulta em **200**.
- **Impacto:** uma sessão revogada, expirada ou com permissões retiradas ainda pode concluir alterações administrativas que estavam em andamento. Não permite que alguém que nunca teve acesso admin inicie a operação.
- **Correção:** revalidar sessão e papel após a leitura assíncrona; para garantia entre instâncias, verificar a autorização junto da escrita protegida. Criar testes de logout, expiração e mudança de papel durante o envio.

### A2. Reservas permitem abuso de armazenamento e ocupação

- **Evidência:** `Backend/src/modules/reservations/routes.ts:23`, `repository.ts:67` e `:90`. Não há limite de taxa de criação/transição. Cada nova chave grava uma tentativa, mesmo em recusas de negócio. Não há limpeza de `reservation_requests`.
- **Reprodução confirmada:** 40 tentativas contra um evento inexistente retornaram 404, mas criaram **40 registros de idempotência e 40 notificações**. Repetir uma confirmação também produz novas notificações, embora mantenha a mesma compra corretamente.
- **Impacto:** um usuário autenticado pode gerar escrita contínua, aumentar permanentemente o banco, ocupar o único escritor SQLite e degradar outras requisições. Também pode criar várias reservas válidas e monopolizar temporariamente o estoque, sem exceder a capacidade.
- **Correção:** limitar taxa por usuário/IP/operação, limitar intenções pendentes conforme a regra de negócio e definir retenção de tentativas recusadas. A política de retenção deve preservar o contrato de idempotência, evitando recriar uma reserva ao repetir uma chave antiga.

### A3. WebSocket sem limite de conexões e frequência de mensagens

- **Evidência:** `Backend/src/realtime/server.ts:10`, `:24` e `:45`. Há limite de tamanho da mensagem e de buffer de saída, mas não há limite de conexões por usuário/IP, frequência de mensagens ou frequência de replay. Cada conexão consulta sessão e outbox a cada 250 ms. O cliente pode enviar `resume` repetidamente, inclusive voltando ao cursor zero.
- **Reprodução confirmada:** uma única sessão abriu **12 conexões simultâneas**, todas aceitas. A ausência de limitação de replay foi constatada no código; não foi executado ataque de saturação.
- **Impacto:** amplificação de consultas, reenvio repetido de notificações autorizadas, consumo de sockets, CPU e memória. Autenticação não impede abuso por uma conta válida.
- **Correção:** cotas de conexões, limite de mensagens e replay por intervalo, restrições de retrocesso do cursor e orçamento de consultas/envio. Distribuir as cotas quando houver várias instâncias.

### A4. Relógio regressivo pode quebrar a capacidade

- **Condição:** o horário do servidor precisa voltar para trás quando uma pendente já venceu, mas ainda não foi persistida como EXPIRADA. O cliente não controla esse relógio pela API.
- **Evidência:** `Backend/src/modules/events/inventory.ts:6`, `repository.ts:47` e `Backend/src/modules/reservations/repository.ts:113`. A edição da capacidade desconta vencidas por data, sem persistir sua expiração; a confirmação não verifica novamente a ocupação total.
- **Reprodução confirmada com relógio controlado:** criar reserva de 2 em evento de capacidade 2; avançar até expiresAt; reduzir capacidade para 1; voltar ao horário anterior. A pendente volta a contar, a disponibilidade fica **-1** e sua confirmação retorna **200**, deixando 2 confirmados para capacidade 1.
- **Impacto:** disponibilidade negativa e confirmação acima da capacidade em caso de ajuste regressivo do relógio. A concorrência normal entre processos, sem regressão de tempo, passou nos testes.
- **Correção:** tornar a expiração observada irreversível ao editar capacidade, garantir referência temporal consistente entre processos e validar também a invariante de ocupação nas transições. Testar essa regressão explicitamente. Apenas esconder valores negativos na resposta não resolve o problema.

### A5. Conta administrativa de demonstração perigosa em produção

- **Condição:** publicar o banco de desenvolvimento, rodar `yarn seed` em produção ou manter `SEED_ON_START=true` ao configurar produção.
- **Evidência:** `Backend/src/database/seed.ts:7`, `Backend/src/config/env.ts:12`, `Backend/.env.example:5`. A seed contém credenciais conhecidas de admin; a configuração permite ativá-la explicitamente em produção. Desativar a seed não apaga contas existentes.
- **Impacto:** qualquer pessoa que conheça as credenciais de demonstração pode administrar eventos se a conta continuar habilitada no ambiente publicado.
- **Correção:** separar seed de demonstração do provisionamento real e impedir sua execução acidental em produção. Remover ou desabilitar contas de teste antes de publicar. Credenciais de teste no repositório são esperadas para a demonstração e não foram tratadas como vazamento de segredo real.

### A6. Migrações promovem admin apenas pelo e-mail

- **Condição:** atualizar um banco anterior às migrations 003/004 que já contenha uma conta registrada com o e-mail de demonstração Gustavo. Não é uma promoção remota em um banco atual já migrado.
- **Evidência:** `Backend/src/database/migrations/003-events.ts:5` e `004-event-content.ts:7`. As migrations atribuem admin com `UPDATE ... WHERE email`, preservando a senha existente.
- **Reprodução confirmada em banco legado temporário:** uma conta pré-existente com esse e-mail e hash controlado pela conta recebeu **role=admin** após as migrations.
- **Impacto:** concessão administrativa a uma identidade não verificada durante upgrade. Não foi demonstrado que essa conta exista no banco do usuário.
- **Correção:** provisionamento administrativo explícito, separado de migrations estruturais; não atribuir privilégios a contas existentes apenas por coincidência com um endereço público da seed.

## Média

### M1. WS divulga metadados de rascunhos que HTTP oculta

- **Evidência:** `Backend/src/modules/events/repository.ts:51`, `inventory.ts:14` e `Backend/src/realtime/server.ts:47`. Atualizar rascunhos gera notificação pública sem filtrar publicação ou permissão de admin.
- **Reprodução confirmada:** usuário comum recebeu `eventId` e `capacity=321` de um rascunho por WS, enquanto o GET autenticado do mesmo evento retornou 404.
- **Impacto:** revela existência e capacidade de eventos não publicados. Não expõe título/conteúdo, credenciais ou reservas privadas nesse payload.
- **Correção:** aplicar a política de visibilidade dos eventos também na emissão/distribuição das notificações.

### M2. 401 atrasado invalida uma sessão nova no frontend

- **Evidência:** `Frontend/src/api/auth.ts:23` dispara invalidação global sem verificar a geração da sessão. `Frontend/src/context/AuthProvider.tsx:75` aceita o evento e troca o estado para anônimo.
- **Reprodução confirmada no navegador:** pausar uma consulta de reserva feita como Rafael; autenticar Gustavo e atualizar o contexto; entregar o 401 real da consulta com o cookie antigo revogado. O frontend redireciona para login, embora `/api/auth/me` com o novo cookie continue retornando Gustavo com 200.
- **Impacto:** falsa perda de sessão, interrupção de fluxo e telas incoerentes em corridas entre abas/requisições. Não permite consultar a reserva alheia.
- **Correção:** associar respostas à geração da sessão ou consultar a identidade atual antes de invalidar o estado por um erro atrasado.

### M3. Limitação de login pode bloquear o usuário correto ou todo o tráfego atrás de um proxy

- **Evidência:** `Backend/src/middlewares/login-rate-limit.ts:9` e `Backend/src/modules/auth/controller.ts:22`. O limite por e-mail é global, inclui tentativas bem-sucedidas e não é zerado após sucesso. O IP vem diretamente do socket.
- **Reprodução confirmada:** 10 senhas incorretas para uma conta fizeram uma tentativa seguinte, com a senha correta, retornar 429.
- **Impacto:** terceiros podem provocar bloqueio temporário de uma conta conhecida. Em um proxy reverso, os visitantes podem compartilhar o IP do proxy e atingir juntos o limite de 30 tentativas por 15 minutos.
- **Correção:** política contra abuso que reduza bloqueio deliberado de vítimas, tratamento separado de sucesso/falha e configuração explícita de proxies confiáveis. Não confiar indiscriminadamente em X-Forwarded-For.

### M4. Orçamento de uploads não é global

- **Evidência:** `Backend/src/modules/files/controller.ts:11`, `Backend/src/modules/events/routes.ts:16` e `Backend/src/modules/files/image.ts:5`. Avatar e banner possuem conjuntos de upload independentes, com quatro envios cada; várias instâncias possuem conjuntos próprios. A checagem do limite persistente por usuário usa SELECT e incremento separados.
- **Impacto potencial:** a soma de envios de até 25 MB e imagens de até 100 megapixels pode ultrapassar o orçamento de memória/CPU; requisições distribuídas entre instâncias podem passar juntas na checagem de taxa. Não foi executado benchmark de esgotamento nem demonstrada queda por imagens válidas.
- **Correção:** orçamento compartilhado para processamento de imagens, limites distribuídos/atômicos e prazo máximo de processamento. Manter o tamanho solicitado, mas dimensionar o serviço para ele.

### M5. Falha da limpeza pode gerar rejeição assíncrona não tratada

- **Evidência:** `Backend/src/modules/files/service.ts:10`, `Backend/src/server.ts:17` e `:30`. A leitura da fila ocorre fora do catch que protege cada job; chamadas usam `void cleanupFiles()` sem capturar rejeição. Um try/catch síncrono em torno dessa chamada não captura a rejeição da Promise.
- **Verificação com falha injetada no banco temporário:** erro ao ler a fila fez a Promise de limpeza rejeitar. Não foi induzido erro real de disco nem queda no servidor do usuário.
- **Impacto potencial:** encerramento do processo por rejeição não tratada, dependendo da política do Node, em falhas de banco/armazenamento; uma tarefa auxiliar pode afetar o serviço principal.
- **Correção:** capturar falhas na operação inteira e tratar explicitamente todas as Promises iniciadas em segundo plano, inclusive durante shutdown.

### M6. Dez limpezas permanentemente falhas bloqueiam o restante da fila

- **Evidência:** `Backend/src/modules/files/repository.ts:32` busca sempre os 10 jobs mais antigos. Não há tentativas, próxima execução, backoff ou rotação.
- **Reprodução com provedor simulado:** 11 jobs, os 10 primeiros falhando. Após duas rodadas, os primeiros receberam 20 tentativas e o último não foi tentado nenhuma vez, mesmo sendo removível.
- **Impacto:** arquivos antigos podem permanecer públicos e acumulados no Cloudinary, com custo e problemas de retenção.
- **Correção:** controlar tentativas/nextAttemptAt, distribuir execução entre jobs e alertar sobre falhas permanentes.

### M7. Banner e arquivamento não têm uma única checagem protegida

- **Evidência por inspeção:** `Backend/src/modules/events/routes.ts:94` verifica o evento antes de chamar o repository; `Backend/src/modules/files/repository.ts:11` atualiza apenas por ID, sem `archived_at IS NULL` nem verificar o número de linhas.
- **Condição:** outro processo arquivar o evento entre a checagem e a atualização, ou entre o commit e a consulta da resposta. Não foi reproduzida essa corrida com uploads em duas instâncias.
- **Impacto possível:** upload altera um evento já arquivado; a consulta final retorna 404 e a rotina de erro pode enfileirar para exclusão o arquivo já vinculado no SQLite, deixando a referência quebrada. O filtro por archived_at ainda impede exibir o evento no catálogo: não se demonstrou publicação pública de um arquivado.
- **Correção:** verificar arquivamento e vincular o banner na mesma transação protegida; condicionar a atualização, verificar o resultado e distinguir falha anterior de falha posterior ao commit na compensação do upload.

## Baixa / reforços antes de publicação

### B1. Proteções de transporte e página dependem do deploy

O projeto não define CSP, frame-ancestors/X-Frame-Options nem HSTS. HTTP é nativo e o cookie Secure depende de NODE_ENV. Isso é compatível com desenvolvimento local, mas uma publicação incorreta pode expor credenciais/sessões ou permitir enquadramento da interface. A configuração real do host não foi auditada. Definir HTTPS, NODE_ENV, origens e os headers no servidor/proxy que entrega o frontend.

Referências: `Backend/src/config/env.ts:1`, `Backend/src/modules/auth/cookies.ts:10`, `Frontend/index.html`.

### B2. Arquivos e imagens externas têm implicações de privacidade

Avatares/banners são publicados como uploads públicos do Cloudinary, e Markdown permite imagens externas diretamente no navegador. A URL do arquivo pode ser acessada fora da sessão; imagens externas podem informar IP e acesso ao domínio que as hospeda. São decisões de produto, não bypass de autenticação da API nem SSRF no backend. Se imagens precisarem ser privadas, adotar entrega autenticada/assinada e política para origens de imagens.

Referências: `Backend/src/storage/cloudinary.ts:33`, `Frontend/src/components/events/MarkdownContent.tsx:9`.

### B3. Falta trilha persistente das ações administrativas e eventos de segurança

Há timestamps e logs de erros, mas não há registro consistente de ator, ação, recurso e resultado para edições, arquivamentos, falhas de autorização, bloqueios e abuso de WS. Isso dificulta investigar incidentes e distinguir erro operacional de abuso. Registrar eventos estruturados sem tokens, senhas ou payloads pessoais completos.

Referências: `Backend/src/modules/events/repository.ts:50`, `Backend/src/middlewares/error-handler.ts`, `Backend/src/realtime/server.ts`.

## Limites intencionais, não vulnerabilidades confirmadas

- O catálogo e detalhes publicados são públicos por decisão do projeto; isso não concede edição nem acesso a reservas.
- O QR Code contém o UUID da reserva para leitura fictícia. Não é uma autorização assinada, não marca utilização e pode ser copiado. Antes de uma portaria real, validar no servidor status, evento, validade e uso único. Na simulação solicitada, isso não é uma falha.
- A confirmação simula compra; não se pressupõe proteção financeira ou integração de pagamento.
- Login/registro revelam a existência de e-mail no caso de registro duplicado; essa mensagem é uma escolha de UX, com risco de enumeração, atenuado pelos limites existentes. Login usa mensagem uniforme.
- A referência de horário do servidor protege o prazo de reserva, mas `Frontend/src/lib/events.ts` usa o relógio do dispositivo para habilitar o botão do evento. Um dispositivo com hora errada pode exibir um botão incorreto; a API continua validando o evento corretamente.

## Proteções que foram verificadas

- Argon2id para senhas; sessão aleatória de 256 bits, somente hash no SQLite; cookie HttpOnly/SameSite e Secure em produção.
- Origem permitida e header customizado em mutações; WS exige sessão e origem, e fecha após revogação/expiração.
- Reservas alheias retornam 404, inclusive para admin; listagem filtra pela identidade autenticada.
- Preço, total, dono e prazo são determinados pelo backend; parâmetros SQL são vinculados, e o conteúdo Markdown bloqueia HTML bruto.
- Transações IMMEDIATE protegem a capacidade na concorrência normal entre processos; confirmação repetida não duplica ingressos, e cancelamento repetido conflita.
- Uploads validam formato real, tamanho, resolução e animação; reencodificam imagens e retiram metadados.
- Seed idempotente, migrations e lockfiles presentes no Git no estado revisado.

## Prioridade sugerida

1. A1: corrigir a autorização após awaits e adicionar teste de revogação durante envio.
2. A2/A3: limitar abuso de HTTP/WS e crescimento persistente.
3. A4: proteger a invariante contra regressão temporal e edição de capacidade.
4. A5/A6: isolar demonstração e provisionamento administrativo de produção/upgrades.
5. M1/M2: alinhar visibilidade do WS e geração da sessão no frontend.
6. M3–M7: limites operacionais, limpeza e atomicidade do upload.

## Referências de revisão

- [OWASP: autorização](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): checagens no ponto correto, menor privilégio, logs e testes.
- [OWASP: segurança de WebSocket](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html): limites de conexão/mensagens, sessão, origem e controles de recurso.
- [OWASP: sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): cookies e proteção de transporte.

Os scripts de reprodução desta revisão estão fora da árvore versionada, no diretório temporário do Windows: `reservai-security-check.cjs`, `reservai-security-clock.cjs` e `reservai-security-ui.cjs`. Eles criam bancos de teste próprios. Antes de executá-los novamente em outro ambiente, revisar os caminhos e compilar o Backend.

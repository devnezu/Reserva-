# Decisões e limites

Como o projeto foi estruturado, por que cada escolha foi feita, o que funciona e o que ficou de fora.

## Estrutura

- **Dois projetos independentes**, `Backend` e `Frontend`, cada um com suas dependências e seu lockfile. Rodam com `yarn dev` em cada pasta.
- **Backend sem framework.** O servidor usa o módulo HTTP nativo do Node. O conjunto de rotas é pequeno e isso mantém visível, em poucos arquivos, tudo o que acontece com uma requisição. O custo é escrever à mão o que um framework daria pronto, como leitura de corpo e roteamento.
- **Sem ORM.** O acesso ao banco é SQL direto pelo `better-sqlite3`. A regra central do desafio depende de controlar exatamente a transação e a consulta de disponibilidade, e o SQL explícito deixa isso auditável.
- **Separação por módulo.** Cada área (`auth`, `events`, `reservations`, `files`) tem as rotas, que tratam HTTP e validação de entrada, e o repositório, que concentra as regras e o banco. Em reservas, as regras de negócio ficam no repositório porque precisam rodar dentro da transação.
- **SQLite.** É um dos bancos permitidos e é o mais rápido de instalar e configurar: não há servidor de banco para subir, e o arquivo persiste entre reinícios.

## Autenticação

- **Sessão em cookie**, não JWT. É uma preferência de experiência: depois de anos usando JWT, sessão no servidor sempre me deu menos problemas. O ganho concreto aqui é poder invalidar o acesso na hora, no logout, sem esperar um token expirar. O login gera um identificador aleatório de 256 bits; o banco guarda só o hash SHA-256 dele, então um vazamento do banco não entrega sessões utilizáveis.
- **Cookie** `HttpOnly` e `SameSite=Lax`, e `Secure` em produção. O JavaScript da página não tem acesso a ele.
- **Validade de 7 dias.** A sessão é trocada a cada novo login.
- **Logout** apaga a sessão no banco, então o cookie antigo deixa de valer imediatamente, e a conexão de tempo real daquela sessão é encerrada.
- **Senhas** com Argon2id. E-mails inexistentes passam pela mesma verificação, para o tempo de resposta não revelar quais contas existem.
- **Proteção de requisições que alteram dados:** só são aceitas com a origem em uma lista permitida e com um cabeçalho próprio, o que impede que outro site dispare ações em nome do usuário.
- **Limite de tentativas** de login e de cadastro, por IP e por e-mail.
- **Identidade vem da sessão.** Usuário, preço, total, estado e validade nunca são lidos do corpo da requisição.

## Concorrência

A regra é: disponíveis = capacidade − ingressos confirmados − ingressos de reservas pendentes ainda válidas.

- **A disponibilidade é calculada a partir das próprias reservas**, na hora, e não mantida em um contador separado. Assim não existem dois números que possam divergir.
- **Verificar e reservar acontecem na mesma transação de escrita** (`BEGIN IMMEDIATE`). O SQLite permite uma única transação de escrita por vez no arquivo do banco, então a segunda tentativa só enxerga a disponibilidade depois que a primeira terminou.
- **Vale entre processos.** O bloqueio é do banco, não da memória do servidor, e continua valendo com mais de uma instância do backend usando o mesmo arquivo. Os testes de concorrência sobem dois processos para provar isso.
- **O banco também recusa dados inválidos:** quantidade fora de 1 a 4, total diferente de quantidade vezes preço e `expiresAt` diferente de criação mais 5 minutos são barrados por restrições da tabela. Gatilhos impedem alterar quantidade ou preço de uma reserva e impedem que um estado final volte a `PENDENTE`.
- **Idempotência na criação.** Cada tentativa de reserva leva uma chave. Se a resposta se perder e o navegador repetir, a mesma reserva é devolvida, sem criar outra.
- **Banco ocupado não é "esgotado".** Se a transação não conseguir o bloqueio a tempo, a API responde 503 pedindo nova tentativa, em vez de dizer que não há ingressos.

## Expiração

- **Calculada pela data, sob demanda.** Uma reserva `PENDENTE` deixa de ocupar capacidade no instante em que o horário do servidor alcança `expiresAt`, mesmo que ninguém tenha gravado ainda o estado `EXPIRADA`. Não depende de cron, fila ou worker, e continua correta depois de reiniciar o servidor.
- **O estado é gravado na próxima consulta ou tentativa** que tocar aquela reserva ou aquele evento. Um temporizador no servidor também grava expirações a cada segundo, mas só para atualizar as telas mais rápido; a correção não depende dele.
- **Revalidada ao confirmar e ao cancelar**, dentro da transação, com o horário capturado depois de obter o bloqueio.
- **O relógio do navegador não decide nada.** A contagem regressiva usa `expiresAt` e o horário devolvido pelo servidor; ao chegar a zero, a tela consulta a API. Recarregar a página não reinicia o prazo.
- **Testes controlam o relógio** passando o horário para as funções de reserva, o que permite testar o milissegundo exato do limite sem esperar.

## Reservas de outro usuário: 404

Consultar, confirmar ou cancelar uma reserva alheia responde **404**, idêntico ao de uma reserva inexistente. Escolhi 404 em vez de 403 para não confirmar a quem pergunta que aquele identificador existe. Isso vale inclusive para o administrador.

## Decisões que divergem do enunciado

- **Catálogo público.** O enunciado fala em usuários autenticados listando e consultando eventos. Aqui a listagem e a página do evento podem ser vistas sem login, como em uma bilheteria real; o login é exigido para reservar e em todas as rotas de reserva e de conta. É uma escolha de produto mantida de propósito.
- **Cadastro de usuários.** O enunciado diz "sem cadastro". Mantive o cadastro porque quis entregar um produto completo, não só o mínimo. Recuperação de senha continua fora.

## Extras além do escopo

Não são exigidos e não substituem nada do fluxo principal. Entraram pelo mesmo motivo do cadastro: gosto de fazer bem feito.

- Painel de administração de eventos, com papéis de usuário e administrador.
- Notificações em tempo real por WebSocket, para que os dois compradores que disputam os últimos ingressos vejam na hora quem conseguiu. Todo o fluxo funciona só com HTTP.
- QR Code na reserva confirmada, para uma leitura simulada.
- Envio de foto de perfil e de banner pelo Cloudinary. É o único serviço externo e é opcional: sem as chaves, só esses envios ficam indisponíveis.
- Prazo de reserva por evento, além da data de início.

## O que funciona

- Login, logout, sessão persistente e telas protegidas.
- Catálogo com busca por nome, filtro por categoria e paginação no servidor, ordenado por data e ID.
- Reserva de 1 a 4 ingressos, com preço e total calculados no servidor, em centavos.
- Contagem regressiva, confirmação e cancelamento.
- "Minhas reservas" apenas com as reservas do usuário e seus estados efetivos.
- Proteção contra venda acima da capacidade sob concorrência.
- Expiração que libera os ingressos.
- Os seis cenários de teste obrigatórios.
- Interface utilizável em desktop e celular.

## Limitações conhecidas

- **Demonstrar a expiração ao vivo exige esperar os 5 minutos.** O prazo é fixo, inclusive por restrição do banco, e não há atalho de desenvolvimento. Nos testes automatizados o relógio é controlado.
- **SQLite serializa as escritas.** É correto e suficiente para este desafio, mas limita a vazão em um cenário de pico real.
- **Vários backends precisam compartilhar o mesmo arquivo de banco.** A proteção entre instâncias vale nessa condição; em máquinas diferentes seria preciso um banco em rede, como o PostgreSQL.
- **Limite de envios simultâneos de imagem é por processo**, em memória. Não afeta reservas.
- **Datas dos eventos do seed são relativas ao dia em que ele roda.** Um banco antigo pode ter eventos já encerrados; apagar o banco e rodar de novo resolve.
- **Há um único teste automatizado de interface**, o do conflito ao reservar. As demais telas foram verificadas manualmente.

## Pendências e próximos passos

- Integrar um sistema de pagamento real no lugar da confirmação simulada. É o que eu faria primeiro.
- Ampliar os testes de interface para login, contagem regressiva e "Minhas reservas".
- Reduzir o peso das imagens de fundo da home.
- Migrar para PostgreSQL se o projeto precisar de mais de uma máquina, trocando o bloqueio de escrita do SQLite por bloqueio de linha do evento.
- Oferecer um prazo de reserva configurável em ambiente de desenvolvimento, para demonstrar a expiração sem espera.

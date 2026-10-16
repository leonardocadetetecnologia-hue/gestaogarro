# API de leitura de eventos

Feed somente de leitura para uma consulta externa autenticada. Não envia mensagem, não escolhe destinatário e não altera o CRM.

Sem as variáveis de leitura, o endpoint responde 503. Sem o modo de captura, o fechamento comercial e o envio para produção não gravam evento e não abrem transação extra.

## Produção

A gravação permanece desligada até o operador escolher o gatilho. A leitura pode ser configurada à parte, só com escopo, hash do token e segredo do cursor.

- `GARRO_EVENT_CAPTURE_MODE` ausente, vazio ou `disabled` não grava evento.
- Um valor diferente de `sale_closed` e `production_requested` também não grava evento. A API de leitura responde 503. O CRM não é interrompido.
- Só `sale_closed` ou `production_requested`, escritos exatamente assim, gravam o aviso depois que a ação do painel já foi confirmada.
- A migration cria tabelas novas. O rollback dela remove só essas tabelas. Não apaga cliente, venda, demanda nem evento de negócio.

## Escopo

O Garro desta instalação é um único sistema, sem `tenantId`. O feed não usa o nome nem o telefone de quem consulta como identidade. O escopo é o valor fixo de `GARRO_EVENTS_SCOPE`, gravado em cada evento e exigido no cursor. Uma credencial configurada para `empresa-a` não lê eventos de `empresa-b`. Não há segunda empresa no banco atual; o teste cobre essa fronteira com fixtures. Nesta instalação o escopo de leitura é `garro`. A gravação continua desligada até a escolha do gatilho.

## Modos

Os dois modos estão implementados e desligados.

- `sale_closed` grava `crm.sale_closed.v1` apenas quando a etapa passa de algo que não é `FECHADO` para `FECHADO` em `executeCrmCommand`. Nesse instante a venda e a demanda podem não existir; `saleId` e `demandId` vão nulos. Fechar de novo, sem reabrir, não gera outro evento. Se a oportunidade for reaberta e fechada outra vez, um evento novo pode ser gravado, com outro `eventId` e outra `deduplicationKey` (`tipo:opportunityId:sequence`). Isso fica para revisão antes de ligar o modo.
- `production_requested` grava `crm.production_requested.v1` só quando `sendToProduction` cria a demanda. A chave é `crm.production_requested.v1:demandId`. `alreadySent=true`, edição, simples fechamento e demanda direta da Gestora não geram evento.

`closeOpportunity` existe em `src/modules/crm/actions.ts` e não tem chamada no `src` atual. Não foi instrumentada.

## Ordem e locks

O contador é a linha `IntegrationFeedCounter` de id `feed`. A ação do painel confirma a venda ou a demanda primeiro. Só depois, e somente com o modo ligado, o aviso abre a própria transação:

1. bloqueia o contador com `SELECT FOR UPDATE` e incrementa;
2. insere o evento;
3. o commit libera o contador.

Se essa gravação falha, o aviso se perde e o fluxo do painel permanece concluído. O Instinct lê o evento quando quiser; o Garro não espera resposta dele e não envia WhatsApp. Não há retenção automática. O volume cresce até uma política futura, com marco explícito de expiração. Nada do histórico antigo é convertido em evento.

## Contrato

`GET /api/integrations/events`. Com o `basePath` publicado, a URL externa é `/gestaogarro/api/integrations/events`. O middleware do Next enxerga o caminho sem o prefixo e também aceita o caminho já prefixado. O restante da API continua exigindo sessão.

Parâmetros: `cursor` opaco e opcional; `limit` inteiro de 1 a 100, padrão 50.

```json
{
  "schemaVersion": 1,
  "captureMode": "disabled",
  "events": [],
  "nextCursor": "cursor-opaco",
  "hasMore": false
}
```

Cada item traz `eventId`, `type`, `schemaVersion`, `occurredAt` e `data` com `opportunityId`, `saleId`, `demandId`, `customerName`, `serviceTitle`, `clientDueAt` em UTC ou null, `source` igual a `CRM` e `demandPath` relativo ou null. O caminho usa `BASE_PATH` e o id codificado. Não há domínio vindo da requisição.

Não entram CPF, telefone, e-mail, senha, token, conversa, briefing completo, arquivo nem valor da venda. O payload é o snapshot gravado no evento.

`nextCursor` aponta para o último item devolvido. Página vazia devolve o mesmo cursor recebido, ou o cursor inicial se a consulta não trouxe cursor. Não salta para o maior id do banco. Cursor malformado: 400 `invalid_cursor`. Cursor de outra versão ou de outro escopo: 410 `cursor_expired`. Limite inválido: 400 `invalid_limit`.

GET não marca leitura nem consome o evento. Repetir o cursor devolve os mesmos eventos ainda armazenados. Não existe rota pública para criar evento. POST, PUT, PATCH e DELETE respondem 405.

## Segurança

O token bearer é exclusivo deste feed. No servidor fica só o SHA-256 em `GARRO_EVENTS_TOKEN_SHA256`. A comparação usa `timingSafeEqual` depois de conferir o tamanho. A senha de gestor e o `SESSION_SECRET` não servem como token.

Toda leitura exige `Authorization: Bearer`, inclusive lista vazia e modo `disabled`. Cookie `garro_session` sozinho não autoriza. Sem token, token inválido ou header malformado: 401 `{ "error": "unauthorized" }`, sem redirect. Configuração ausente ou inválida: 503 `{ "error": "unavailable" }`.

A rota é dinâmica, runtime Node.js, `Cache-Control: no-store`. Header e cursor têm limite de tamanho. O limite é 60 leituras por minuto para o hash do header apresentado e 20 por minuto para chamadas sem header utilizável. Não usa `X-Forwarded-For`. O 429 traz `Retry-After`. Não há CORS aberto. Log não registra `Authorization`, token, payload nem dados de cliente.

O token bruto não entra no Git, na URL, em log nem neste documento. Ele é entregue uma vez ao operador, fora do repositório.

## Operação manual

Aplicar a migration só num banco que não seja o de produção, e em produção somente depois de autorização explícita:

```bash
npx prisma migrate deploy
```

Rollback, sem mexer nos dados de negócio:

```sql
DROP TABLE "IntegrationEvent";
DROP TABLE "IntegrationFeedCounter";
```

Consulta de ensaio, com o token fora do comando. O exemplo usa placeholder:

```text
GET https://OPERADOR/gestaogarro/api/integrations/events?limit=1
Authorization: Bearer <token-do-cofre>
```

O cliente HTTP deve montar o header sem imprimir o segredo e sem modo verbose. O primeiro GET externo só valida autenticação, resposta e `basePath`. Evento real só depois da escolha do modo, do ambiente e de um marco inicial.

## Teste de concorrência

O teste que abre duas transações PostgreSQL fica em `src/lib/integration-feed.integration.test.ts`. Ele só roda com `TEST_DATABASE_URL` apontando para um banco local cujo nome contém `test`. Não usa o `DATABASE_URL` da aplicação. Sem essa variável, o teste é ignorado e isso não conta como execução.

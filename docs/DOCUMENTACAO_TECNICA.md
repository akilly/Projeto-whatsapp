# Documentação técnica · Hanne Essencial

Referência de manutenção da versão essencial do Hanne: atendimentos (WhatsApp e notas internas), orçamentos, tarefas, estoque e serviços. Ela nasceu do sistema completo (`akilly/Projeto-gestao-salao`) retirando agenda, cadastro de clientes e financeiro. Operação diária: MANUAL_USUARIO.md. Arquivos: MAPA_ARQUIVOS.md.

## Arquitetura e execução

O navegador recebe HTML pela rota app/route.ts, depois carrega public/app.js como módulo ES e as folhas public/style.css, public/atelier.css, public/theme.css e public/glass.css, nesta ordem. A aplicação usa JavaScript e templates HTML com delegação de eventos. Vinext, React, Vite e Cloudflare Workers fornecem o runtime; as telas de negócio atuais usam os módulos em public.

A autenticação é feita pelas contas de `salon_users` em lib/salon-auth.mjs. Cada conta é um salão: o `owner_id` da sessão é a chave de todos os registros (`atelier_accounts.user_id`, `wa_connections.user_id`, `ai_usage.owner_id`), então um salão nunca lê os dados de outro. A primeira conta é a titular (`role = admin`, mantém o `owner_id` histórico da base) e convida os demais salões; um salão desativado perde as sessões e não entra mais, mas os dados ficam guardados.

A rota /api/state encaminha GET e POST ao handler em lib/state-handler.mjs com env.DB. O D1 guarda um agregado JSON completo por base de usuário, acompanhado por revisão. Não há backend Supabase, processamento agendado, conexão bancária automática. O canal WhatsApp tem tabelas próprias (`wa_*`), fora do agregado JSON.

Fluxo de leitura: autenticação → GET da base selecionada → carregamento no navegador → renderização. Fluxo de alteração: ação do usuário → alteração em memória ou cópia transacional → validação do domínio → fila de POST → validação no servidor → gravação condicionada à revisão → atualização da revisão confirmada e da auditoria.

## Estado e relacionamentos

O agregado salvo por conta é o `schema 3` (`public/domain.js`):

| Coleção | Campos principais |
|---|---|
| `settings` | `name`, `responseMinutes` |
| `services` | `name`, `description`, `duration`, `products`, `before`, `after` |
| `conversations` | Notas internas de atendimento: `contact`, `category`, `status` (`open`, `waiting`, `resolved`), `messages[]` (`incoming` ou `note`), `summary`, `summaryAI`, `draft` |
| `quotes` | `contact`, `origin`, `serviceId` (ou `null` com `serviceName`), `status` (`missing`, `review`, `approved`, `closed`), `value`, `date`, `notes`, `question`, `photos[]` (data URL, até 3) |
| `tasks` | `title`, `area`, `priority`, `due`, `done`, `contact` (opcional), `origin`, `quoteId` |
| `products` | `name`, `brand`, `unit` (`g`, `ml`, `un`), `packageSize`, `minimum` |
| `movements` | `productId`, `type` (`opening`, `purchase`, `use`, `loss`, `valuation`), `date`, `quantity` (negativa nas saídas), `unitCost` (ou `null`), `total`, `note` |
| `audit` | Até 200 ações recentes (o servidor acrescenta o evento de cada gravação) |

**Contato** é `{ name, phone }`: nome obrigatório (até 100), telefone opcional com 10 a 15 dígitos. Não existe coleção de clientes; `knownContacts` monta as sugestões a partir de notas, orçamentos, tarefas e das conversas do WhatsApp já carregadas.

**Origem** é `{ type: 'whatsapp' | 'note', id }`. Para `note`, o id precisa existir em `conversations`; para `whatsapp`, é o id da conversa no canal (tabela `wa_threads`), que não é validado contra o agregado.

`validateState` confere formato, ids únicos, contatos, origens, referências (serviço, orçamento), fotos e o livro de estoque. Com a versão anterior, recusa remoções com vínculo (`deletionBlock`) e qualquer movimento removido ou com produto/tipo trocado.

## Estoque e custo

`stockOf` refaz saldo e custo médio ponderado na ordem dos movimentos. Entradas com custo desconhecido deixam o custo `null` (“a conferir”) até uma conferência (`valuation`) ou até o saldo zerar. Saídas (`use`, `loss`) guardam o custo médio do momento. `stockEntry` cria entrada, uso, perda ou conferência numa cópia do estado, recusando datas anteriores ao último movimento do produto, datas futuras e saídas maiores que o saldo. Compras não geram despesa.

Ao corrigir um movimento, `recost` recalcula o custo registrado em todas as saídas seguintes; o servidor confere o resultado com o mesmo algoritmo. Estoque negativo, data futura, ordem cronológica quebrada e custo divergente são recusados.

## Contrato da API

GET /api/state lê a operação real. GET /api/state?dataset=example lê a demonstração. Uma seleção diferente e não vazia é recusada. A resposta inclui state, revision, updatedAt e dataset. Ausência de snapshot resulta no estado inicial, com revisão zero. A demonstração inicial é gerada em memória e passa a ter snapshot persistido na primeira alteração gravada.

POST usa a mesma seleção e Content-Type application/json. O corpo contém state completo, revision inteira não negativa e action textual opcional. A origem deve corresponder à URL da requisição. A resposta de sucesso contém revision, updatedAt e, quando houve alteração, audit. Uma alteração somente no campo audit não gera nova revisão.

| Código | Significado |
| --- | --- |
| 200 | Leitura ou gravação aceita; também usado quando não houve alteração material |
| 400 | JSON, revisão ou seleção de base inválidos |
| 401 | Identidade autenticada ausente |
| 403 | Origem da escrita diferente da origem do Site |
| 405 | Método não suportado pelo handler |
| 413 | Corpo acima de 3 milhões de caracteres após a leitura |
| 415 | Tipo de conteúdo não aceito |
| 422 | Estado incompatível com as regras de domínio ou identificação de base incorreta |
| 409 | Revisão desatualizada ou outra escrita venceu a disputa |
| 503 | Binding ausente ou falha de acesso ao banco |

Respostas usam JSON, Cache-Control private, no-store e X-Content-Type-Options nosniff. Consultas usam parâmetros vinculados. O limite do corpo é medido por raw.length, em caracteres JavaScript, e não por uma medição exata de bytes de rede. Cada coleção validada admite até 10 mil itens e IDs de até 100 caracteres.

## Persistência e concorrência

atelier_accounts possui user_id como chave primária, revision, payload e updated_at. atelier_events registra id, user_id, revision, action, changes e created_at. changes contém nomes das partes alteradas; não armazena uma cópia anterior completa. O payload mantém até 200 eventos recentes; a tabela de eventos recebe os eventos aceitos sem mecanismo de restauração disponível na interface.

A chave da operação real é o identificador autenticado. A chave da demonstração acrescenta o sufixo ::examples-v1. O marcador datasetKind example é obrigatório na base fictícia e recusado na base real. A preferência hanne-theme no localStorage escolhe claro ou escuro e não integra o snapshot. A preferência hanne-data-view no localStorage só escolhe a visualização; atendimentos, orçamentos, tarefas e estoque ficam no banco, não no armazenamento local.

Na atualização, o handler lê a revisão anterior e valida o novo estado contra o anterior. O UPDATE inclui WHERE revision = revisão lida; a primeira gravação usa INSERT OR IGNORE. Um batch D1 executa a alteração do snapshot e a inserção do evento condicionada a changes() = 1. Se outra gravação vencer, a API responde 409. Não há mesclagem automática entre dois dispositivos.

No navegador, queueSave e flushSave serializam os envios. confirmedState representa a última versão confirmada, state contém o trabalho atual, revision acompanha o servidor e savePending sinaliza mudanças aguardando envio. Em conflito ou falha, o rascunho permanece na memória da aba para exportar ou conferir. Fechar a aba pode perdê-lo. Não há fila offline persistente nem garantia de atualização por polling em segundo plano.

## Canal WhatsApp

`lib/whatsapp-handler.mjs` implementa as rotas autenticadas de conexão, caixa, envio e mídia, a sincronização pública do conector Baileys (autenticada pela chave do conector) e o webhook HMAC da Meta. `lib/whatsapp-domain.mjs` concentra cifragem, janela, identidade e validação de mídia; `lib/meta-cloud.mjs` implementa o transporte oficial da Meta. `public/whatsapp.js` preserva rascunhos por conversa e usa os primitivos de interface compartilhados. As tabelas `wa_*` do canal são independentes do agregado JSON.

Provedor na tela: **Baileys** em modo "o conector chama o site". O processo Node em `services/baileys` roda no computador do ateliê e sincroniza por `POST /api/whatsapp/bridge/sync` (Bearer com a chave do conector), sem porta, túnel ou domínio. A migração 0004 cria `wa_bridge` (hash da chave, estado e comando pendente) e `wa_outbox` (fila de envio). Anexos ficam no Workers KV (`MEDIA`). Rotas, estados e limites: `INTEGRACAO_BAILEYS.md`.

A API oficial da Meta continua no servidor, testada, sem botão na tela atual (`INTEGRACAO_WHATSAPP.md`). A migração 0002 adicionou o provedor e os marcos verificáveis de recebimento da Meta. O adaptador YCloud foi removido em 30/10/2026.

Nas conversas do WhatsApp, os botões **Criar orçamento** e **Criar tarefa** chamam `onCreate` (passado por `app.js`) com nome, telefone (`peer`), id da conversa e o resumo da IA, quando houver. `whatsapp.open(id)` abre uma conversa a partir da origem de um orçamento ou tarefa.

## Exclusões

`public/deletion.js` calcula bloqueios e o plano de exclusão (apagar em cascata e desvincular). O `DELETE /api/state` exige revisão, `confirmed=true`, a senha da conta e a lista serializada dos itens vistos pela usuária; o servidor recalcula o plano e grava em batch com revisão otimista. Regras: `EXCLUSAO_REGISTROS.md`.

## Autenticação

`lib/salon-auth.mjs` usa PBKDF2/SHA-256, sal aleatório e 100.000 iterações, compatíveis com Web Crypto no Worker. Senhas de criação e recuperação têm no mínimo 12 caracteres. Sessões usam 32 bytes aleatórios, persistem apenas SHA-256 do token na D1 e cookie __Host-hanne-session com Secure, HttpOnly, SameSite=Strict, Path=/ e duração de 12 horas. A recuperação pela identidade da titular revoga todas as sessões anteriores. "Esqueci minha senha" e convites usam links por e-mail (Brevo) quando configurados, ou o código `SETUP_TOKEN`. Limite de login: 10 tentativas por origem IP em 15 minutos. API de autenticação e operações de escrita verificam mesma origem.

Os adaptadores de estado e WhatsApp resolvem a sessão no servidor antes de chamar handlers de negócio. O mapeamento aponta para a mesma conta proprietária que já guarda os registros. Webhooks externos mantêm assinatura e deduplicação próprias, sem exigir sessão de visitante. A autenticação da plataforma é preservada para bootstrap/recuperação; após configurar credenciais, ela não substitui o login operacional.

Mensagens apagadas são redigidas (body vazio, media e error nulos, type=deleted) e não aparecem nas consultas. IDs de transporte e tentativas são preservados para idempotência. Excluir uma conversa remove o contato local e limpa o conteúdo de suas mensagens; não é um revoke no WhatsApp e não apaga mídia física do conector. Envios sending/uncertain exigem conferência antes da remoção. Os registros técnicos de auditoria persistem; excluir a entrada visível do histórico não é purga completa de backups ou metadados.


## Desenvolvimento e verificação

`npm test` executa a suíte em `tests/` (inclui SQLite real para a API), `npx tsc --noEmit` confere tipos e `npm run lint` roda o ESLint. `npm run local` compila, aplica as migrações no D1 local e serve em http://localhost:8787. As migrações em `drizzle/` são as mesmas do sistema completo: o banco tem as mesmas tabelas, e o agregado JSON guarda o formato novo.

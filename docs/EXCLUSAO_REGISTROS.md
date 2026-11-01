# Exclusão de registros

Arquivo: `public/deletion.js`. O servidor (`lib/state-handler.mjs`) recalcula o plano a partir do estado salvo e só grava se a lista conferida pela pessoa for idêntica (`plan` do pedido `DELETE /api/state`). A exclusão exige a senha da conta.

## Gravação comum

Numa gravação comum (`POST`), um cadastro só pode desaparecer se `deletionBlock` não encontrar vínculos:

- produto com movimentos de estoque → bloqueado;
- serviço usado em orçamento, nota de atendimento usada como origem, orçamento ligado a tarefa → bloqueado;
- movimentos de estoque nunca somem numa gravação comum.

## Exclusão confirmada (`deletionPlan`)

| Excluir | Apaga junto | Desvincula |
|---|---|---|
| Produto | Todos os movimentos do produto | — |
| Movimento de entrada ou conferência de custo | Movimentos posteriores do mesmo produto | — |
| Movimento de saída (uso ou perda) | — | — (custos das saídas seguintes são recalculados) |
| Serviço | — | Orçamentos: `serviceId` vira `null` e o nome fica em `serviceName` |
| Nota de atendimento | — | Orçamentos e tarefas: `origin` vira `null` |
| Orçamento | — | Tarefas: `quoteId` vira `null` |
| Tarefa | — | — |
| Entrada do histórico | — | — |
| `operation/all` (Configurações) | Tudo, inclusive configurações | — |

Conversas reais do WhatsApp ficam em tabelas próprias e são excluídas pela caixa do WhatsApp. Uma origem `whatsapp` em orçamento ou tarefa guarda só o id da conversa; se ela for apagada, o botão **Abrir conversa** leva à caixa sem a conversa.

`deletionPlan` nunca altera o estado recebido: trabalha numa cópia (há teste para isso), para que o plano exibido seja igual ao recalculado no servidor.

# Hanne Essencial · Atendimento do ateliê

Versão enxuta do [Hanne](https://github.com/akilly/Projeto-gestao-salao), focada no atendimento: **Atendimentos pelo WhatsApp**, **Orçamentos**, **Tarefas**, **Estoque** e **Serviços**. Sistema web em português, pensado primeiro para o celular, com temas claro e escuro.

Saíram desta versão: **agenda, cadastro de clientes, financeiro** (cobranças, pagamentos, sinais, cartões, despesas) e o histórico de procedimentos realizados.

- **Hospedagem:** Cloudflare Workers (Vinext/Vite) + banco D1 + Workers KV (anexos do WhatsApp). Cabe no plano gratuito.
- **Testar no seu computador:** duplo clique em `INICIAR-HANNE.cmd` ([guia](docs/RODAR_NO_PC.md)).
- **Publicar na nuvem gratuita:** siga o [DEPLOY.md](DEPLOY.md). O banco padrão é `hanne-essencial-db`, separado do sistema completo.
- **Manual da usuária:** [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md).

## O que o sistema faz

| Área | Resumo |
|---|---|
| Visão geral | Atendimentos pendentes, orçamentos em andamento, tarefas de hoje e atrasadas, estoque baixo |
| Atendimentos | Duas abas, como no sistema completo: **WhatsApp** (conector no computador do ateliê, QR Code, envio de texto/imagem/áudio, IA que classifica, resume e sugere resposta) e **Notas internas** (pedidos de outros canais, notas, classificação, resumo e rascunho com IA, link wa.me) |
| Orçamentos | Contato, serviço, etapa (faltam informações, em avaliação, avaliado, encerrado), valor, perguntas e até 3 fotos; perguntas enviadas pelo WhatsApp com a mensagem pronta |
| Tarefas | Prazo, prioridade, área, contato, orçamento relacionado e conversa de origem |
| Estoque | Produtos em g/ml/unidade, saldo inicial, entradas (com custo opcional), uso, perda, conferência de custo, custo médio e alerta de mínimo |
| Serviços | Catálogo: nome, descrição, duração, produtos e orientações antes/depois |
| Configurações | Nome do ateliê, conta, salões, tema, exportações (CSV, PDF, JSON), restauração e histórico |

### Sem cadastro de clientes

Cada orçamento, tarefa e nota guarda o **contato** (nome e telefone) e, quando existir, a **origem**: a conversa do WhatsApp ou a nota interna de onde saiu. Nas conversas há os botões **Criar orçamento** e **Criar tarefa**, que já preenchem o contato e o vínculo; no orçamento ou na tarefa, **Abrir conversa** volta para ela. Os nomes já usados aparecem como sugestão ao digitar.

Toda exclusão pede confirmação **e a senha da conta**, e mostra antes tudo o que será apagado ou desvinculado.

## Como rodar no computador (desenvolvimento)

```bash
pnpm install
npm run user:test:create   # cria teste@hanne.local / HanneTeste#2026 só no banco local
npm run local              # http://localhost:8787
```

Abra `/?dados=exemplo` para usar a **demonstração** com dados fictícios (isolada da base real).

## Testes e verificação

```bash
npm test                              # regras, API, persistência (SQLite real), WhatsApp
npx tsc --noEmit                      # tipos
npm run lint                          # ESLint
(cd services/baileys && npm ci && npm test)   # conector do WhatsApp
```

## Estrutura

```
app/            Rotas do servidor (HTML da página, login, /api/state, /api/auth, /api/ai, /api/whatsapp)
lib/            Regras do servidor: estado e persistência, login, IA, WhatsApp (Baileys e Meta)
public/         Interface (JavaScript puro em módulos) e estilos
db/, drizzle/   Esquema do banco e migrações (não alterar migrações já aplicadas)
services/baileys/  Conector do WhatsApp que roda no computador do ateliê (Node + Baileys)
scripts/        Deploy, testes, execução local e infraestrutura
tests/          Testes automatizados (node:test)
docs/           Documentação técnica e manual
```

Detalhes de cada arquivo: [docs/MAPA_ARQUIVOS.md](docs/MAPA_ARQUIVOS.md).

## Regras importantes

- **Vários salões:** cada conta é um salão com dados separados. A primeira conta é a titular, que convida os outros salões (Configurações → Salões).
- **Gravação segura:** o estado é salvo no D1 com revisão otimista e auditoria na mesma transação. Edição concorrente gera conflito explícito, sem perder o rascunho.
- **Estoque consistente:** o livro de movimentos é refeito a cada gravação; saldo negativo, datas fora de ordem ou custo divergente são recusados no navegador e no servidor. Corrigir um movimento recalcula o custo das saídas seguintes.
- **Demonstração isolada:** `/?dados=exemplo` usa outra base; a API recusa gravar dados fictícios na base real.
- **Limites:** 3 MB por gravação, 10 mil itens por coleção, até 3 fotos de 500 KB por orçamento.
- **Formato próprio:** o estado desta versão é o `schema 3`. Ele não é compatível com cópias JSON do sistema completo (que tinham clientes, agenda e financeiro).

## Inteligência artificial

Com o **Workers AI** da Cloudflare (gratuito até 10.000 *neurons* por dia), o sistema classifica as conversas novas do WhatsApp, resume a conversa e sugere uma resposta. A IA só sugere: nada é enviado à cliente sem você. Detalhes em [docs/INTELIGENCIA_ARTIFICIAL.md](docs/INTELIGENCIA_ARTIFICIAL.md).

## WhatsApp

1. **Link wa.me** (sempre disponível): abre o WhatsApp com a mensagem pronta e editável.
2. **Conector Baileys** (opcional, gratuito): roda no computador do ateliê e conversa com o site. Instalação: [docs/WHATSAPP_NO_COMPUTADOR.md](docs/WHATSAPP_NO_COMPUTADOR.md). Detalhes técnicos: [docs/INTEGRACAO_BAILEYS.md](docs/INTEGRACAO_BAILEYS.md).

O servidor também mantém o adaptador da **API oficial da Meta** (sem botão na tela atual): [docs/INTEGRACAO_WHATSAPP.md](docs/INTEGRACAO_WHATSAPP.md).

## Documentação

| Documento | Para quem | Conteúdo |
|---|---|---|
| [MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) | Profissional | Rotina de uso, tela por tela |
| [RODAR_NO_PC.md](docs/RODAR_NO_PC.md) | Profissional | Rodar no computador e migrar para a nuvem depois |
| [DEPLOY.md](DEPLOY.md) | Quem publica | Publicação na Cloudflare, segredos e primeiro acesso |
| [WHATSAPP_NO_COMPUTADOR.md](docs/WHATSAPP_NO_COMPUTADOR.md) | Profissional | Instalar o conector do WhatsApp no Windows |
| [DOCUMENTACAO_TECNICA.md](docs/DOCUMENTACAO_TECNICA.md) | Desenvolvimento | Arquitetura, modelo de dados, API e regras |
| [MAPA_ARQUIVOS.md](docs/MAPA_ARQUIVOS.md) | Desenvolvimento | O que cada arquivo faz |
| [EXCLUSAO_REGISTROS.md](docs/EXCLUSAO_REGISTROS.md) | Desenvolvimento | Regras de exclusão, cascata e desvinculação |
| [SEGURANCA.md](docs/SEGURANCA.md) | Desenvolvimento | Revisão de segurança, proteções e riscos conhecidos |
| [INTELIGENCIA_ARTIFICIAL.md](docs/INTELIGENCIA_ARTIFICIAL.md) | Todos | O que a IA faz, custo, limites e privacidade |
| [DESIGN.md](DESIGN.md), [SISTEMA_VISUAL.md](docs/SISTEMA_VISUAL.md), [UX-CONTRACT.md](UX-CONTRACT.md) | Design | Identidade visual e comportamento (herdados do sistema completo) |

## Fora do escopo

Agenda, cadastro de clientes, financeiro, transcrição de áudio por IA, notificações push e exportação XLSX nativa.

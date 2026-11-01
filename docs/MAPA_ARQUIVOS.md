# Mapa dos arquivos

O que cada arquivo versionado faz. Cada módulo também tem um comentário de cabeçalho e funções comentadas no próprio código.

## Servidor (rotas)

| Arquivo | Papel |
|---|---|
| `app/route.ts` | Página principal (HTML que carrega `public/app.js` e os estilos); exige sessão |
| `app/login/route.ts` | Página de entrada, primeiro acesso e redefinição de senha |
| `app/layout.tsx` | Layout mínimo exigido pelo Vinext |
| `app/api/state/route.ts` | `/api/state`: lê, grava e exclui o estado do ateliê (encaminha para `lib/state-handler.mjs`) |
| `app/api/auth/[...path]/route.ts` | `/api/auth/*`: conta, login, logout e senha (encaminha para `lib/salon-auth.mjs`) |
| `app/api/ai/[task]/route.ts` | `/api/ai/*`: classificação, resumo, sugestão de resposta e status da IA (encaminha para `lib/ai.mjs`) |
| `app/api/whatsapp/[...path]/route.ts` | `/api/whatsapp/*`: canal de WhatsApp (encaminha para `lib/whatsapp-handler.mjs`) |

## Servidor (regras)

| Arquivo | Papel |
|---|---|
| `lib/state-handler.mjs` | Persistência do estado no D1 com revisão otimista, auditoria, base de demonstração isolada e exclusão por plano confirmado |
| `lib/salon-auth.mjs` | Contas dos salões (titular + convidados): PBKDF2, sessões opacas, limite de tentativas, links por e-mail (primeiro acesso, nova senha, convite, troca de e-mail), confirmação de senha para exclusões |
| `lib/ai.mjs` | IA (Workers AI): prompts, validação das respostas, limite diário e rota |
| `lib/mailer.mjs` | Envio de e-mails pelo Brevo e modelo do e-mail de acesso |
| `lib/security-headers.mjs` | Cabeçalhos de segurança das páginas (CSP, anti-iframe, Referrer-Policy, HSTS) |
| `lib/whatsapp-handler.mjs` | Canal de WhatsApp: conexão, conversas, envio, anexos, sincronização do conector Baileys e webhook da Meta |
| `lib/whatsapp-domain.mjs` | Regras puras do canal: telefone, janela de 24 h, cifragem AES-GCM, validação de mídia |
| `lib/meta-cloud.mjs` | Adaptador da API oficial da Meta (sem botão na tela atual) |
| `db/schema.ts` | Esquema Drizzle das tabelas D1 |
| `drizzle/*.sql`, `drizzle/meta/*` | Migrações aplicadas em ordem. **Nunca alterar uma migração já publicada**; crie uma nova |

## Interface (`public/`)

| Arquivo | Papel |
|---|---|
| `app.js` | Aplicativo: estado, páginas (Visão geral, Atendimentos, Orçamentos, Tarefas, Estoque, Serviços, Configurações), formulários, eventos `data-action`/`data-form`, gravação em fila, exclusão confirmada |
| `domain.js` | Regras compartilhadas com o servidor: estado vazio (`schema 3`), contatos e origens, livro de estoque (`stockOf`, `stockEntry`, `recost`), `validateState` |
| `deletion.js` | Bloqueios, plano de exclusão em cascata e desvinculação |
| `core.js` | Data de Brasília, soma de dias e células CSV |
| `navigation.js` | URLs internas (`#page=…`) e paginação |
| `wa-link.js` | Link wa.me com mensagem pronta |
| `whatsapp.js` | Caixa do WhatsApp integrada (conector Baileys), com Criar orçamento / Criar tarefa |
| `form-validation.js` | Mensagens de validação em português, sem balões nativos |
| `theme.js`, `theme-boot.js` | Tema claro/escuro salvo no navegador |
| `examples.js` | Dados fictícios da demonstração |
| `login.js` | Comportamento da página de entrada |
| `style.css` → `atelier.css` → `theme.css` → `glass.css` | Estilos em camadas |
| `baileys-conector.zip` | Pacote do conector para download (gerado a partir de `services/baileys`) |
| `favicon.svg` | Ícone do site |

## Conector do WhatsApp (`services/baileys/`)

| Arquivo | Papel |
|---|---|
| `server.mjs` | Sessão Baileys e laço de sincronização com o site |
| `store.mjs` | Diário SQLite local (envios, eventos pendentes, número esperado) |
| `windows/*.ps1` | Instalar, executar como tarefa do Windows, ver status e desinstalar |
| `*.test.mjs` | Testes do diário e da sincronização contra um site falso |
| `README.md` | Funcionamento, segurança e instalação manual |

## Scripts e configuração

| Arquivo | Papel |
|---|---|
| `scripts/deploy-cloudflare.mjs` | `npm run deploy:cloudflare`: build, migrações remotas e publicação |
| `scripts/configurar-ia.mjs`, `CONFIGURAR-IA.cmd` | `npm run ia:configurar`: login na Cloudflare e liga a IA no computador |
| `scripts/configurar-email.mjs`, `CONFIGURAR-EMAIL.cmd` | `npm run email:configurar`: configura o Brevo (local ou `--nuvem`) e manda e-mail de teste |
| `scripts/local-start.mjs`, `INICIAR-HANNE.cmd` | `npm run local`: roda o sistema no computador (http://localhost:8787) com banco local |
| `scripts/run-tests.mjs` | `npm test`: roda a suíte |
| `scripts/create-local-test-user.mjs` | Cria a conta de teste no D1 local |
| `scripts/run-framework.mjs`, `scripts/execution-profile.mjs`, `scripts/sites-env.*` | Execução do dev/build e ambiente local |
| `scripts/install-*`, `scripts/npm-install.mjs`, `scripts/pnpm-install.mjs`, `scripts/build-verified.sh` | Instalação em CI (infraestrutura do modelo de projeto) |
| `build/*`, `lib/connector-*`, `scripts/connector-preview/*`, `.openai/hosting.json` | Infraestrutura do modelo de projeto (Worker e prévia de conectores). Não contém regra do ateliê |
| `vite.config.ts` | Vite + Cloudflare: bindings locais (D1, KV `MEDIA`) |
| `cloudflare-env.d.ts`, `tsconfig.json`, `eslint.config.mjs`, `drizzle.config.ts`, `next.config.ts` | Tipos e configuração das ferramentas |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc` | Dependências |

## Testes (`tests/`)

| Arquivo | Cobre |
|---|---|
| `domain.test.mjs` | Contatos, orçamentos, tarefas, entradas/saídas, custo médio e recálculo |
| `deletion.test.mjs` | Bloqueios, cascata, desvinculação e plano sem efeitos colaterais |
| `examples.test.mjs`, `core.test.mjs`, `navigation.test.mjs` | Demonstração, utilitários e destinos internos |
| `persistence.test.mjs`, `salon-auth.test.mjs` | API, isolamento de contas, login, sessões e exclusão com senha (SQLite real) |
| `whatsapp.test.mjs`, `baileys.test.mjs`, `meta-cloud.test.mjs`, `wa-link.test.mjs` | Canal de WhatsApp |
| `ai.test.mjs`, `security-headers.test.mjs`, `theme.test.mjs` | IA (modelo simulado), cabeçalhos de segurança e tema |

## Documentação

`README.md`, `DEPLOY.md`, `DESIGN.md`, `UX-CONTRACT.md` e `docs/*.md`. Índice no [README](../README.md#documentação).

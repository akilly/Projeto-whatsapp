# Publicação no Cloudflare Workers + D1

O sistema é um Worker (Vinext) com banco D1. O plano gratuito da Cloudflare atende o uso de uma profissional. Os passos abaixo são feitos uma única vez no computador de quem administra a conta.

## Caminho recomendado: publicação automática pelo GitHub (já preparado)

Já existe na conta Cloudflare:

| Recurso | Nome | ID |
|---|---|---|
| Banco D1 (tabelas criadas) | `hanne-essencial-db` | `cc1e2021-1f8e-4acc-81de-5434c52baac9` |
| KV dos anexos do WhatsApp | `hanne-media` | `28c1e889cf1c42e1ab0159e211736d68` |

O arquivo `.github/workflows/deploy.yml` publica o site a cada push na `main` (ou em **Actions → Publicar na Cloudflare → Run workflow**). Ele roda os testes, faz o build, confere as migrações, publica o Worker `hanne-essencial` e grava os segredos. Tudo no plano gratuito do GitHub e da Cloudflare.

Falta só configurar uma vez:

1. **Ativar os Workers na Cloudflare:** abra o painel → **Workers e Pages**. Se for o primeiro acesso, escolha o subdomínio `workers.dev` (é gratuito). O site vai ficar em `https://hanne-essencial.SEU-SUBDOMINIO.workers.dev`.
2. **Criar o token:** painel → ícone do perfil → **Meu perfil → Tokens de API → Criar token** → modelo **Editar Cloudflare Workers** → em Permissões, **adicione** `Conta · D1 · Editar` → Continuar → Criar. Copie o token (ele aparece uma vez só).
3. **Guardar no GitHub:** no repositório, **Settings → Secrets and variables → Actions → New repository secret**:
   - `CLOUDFLARE_API_TOKEN`: o token do passo 2.
   - `SETUP_TOKEN`: um código seu, com 16 caracteres ou mais (ex.: uma frase sem espaços). É ele que cria a conta da titular no primeiro acesso e redefine a senha sem e-mail. Guarde num lugar seguro.
   - `CLOUDFLARE_ACCOUNT_ID` (só se o token tiver acesso a mais de uma conta): está no painel, em **Workers e Pages**, à direita.
4. **Publicar:** **Actions → Publicar na Cloudflare → Run workflow**. Em 2 a 4 minutos o endereço aparece no log do passo “Publicar”.
5. **Primeiro acesso:** abra o endereço, toque em primeiro acesso, informe seu e-mail, o `SETUP_TOKEN` e crie a senha (mínimo 12 caracteres).

A chave de cifragem do WhatsApp (`WHATSAPP_ENCRYPTION_KEY`) é gerada automaticamente na primeira publicação e nunca é trocada depois. A IA (Workers AI) já vem ligada, dentro da cota gratuita diária.

O caminho manual abaixo (pelo seu computador) continua valendo.

## 1. Pré-requisitos

- Node.js 22.13 ou mais recente.
- Conta Cloudflare (gratuita).
- Dependências instaladas na pasta do projeto:

```bash
npx pnpm@11.25.0 install
```

## 2. Entrar na Cloudflare e criar o banco

```bash
npx wrangler login
```

```bash
npx wrangler d1 create hanne-essencial-db
```

Guarde o `database_id` exibido (formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). O banco `hanne-essencial-db` já existe: use o ID `cc1e2021-1f8e-4acc-81de-5434c52baac9` e pule este comando.

## 3. Publicar

No PowerShell:

```powershell
$env:CLOUDFLARE_D1_DATABASE_ID="cole-o-database_id-aqui"; npm run deploy:cloudflare
```

No macOS/Linux:

```bash
CLOUDFLARE_D1_DATABASE_ID=cole-o-database_id-aqui npm run deploy:cloudflare
```

O script faz o build, aponta o Worker para o banco, aplica as migrações em `drizzle/` e publica. O endereço final aparece no fim (por exemplo `https://hanne-essencial.SEU-USUARIO.workers.dev`). Variáveis opcionais: `WORKER_NAME` (padrão `hanne-essencial`) e `D1_DATABASE_NAME` (padrão `hanne-essencial-db`). Para conferir o pacote sem publicar, acrescente `-- --dry-run`.

## 4. Segredos do servidor

### E-mails de acesso (recomendado)

Com o envio de e-mails configurado, o **primeiro acesso** e o **"Esqueci minha senha"** funcionam por um link enviado ao e-mail da titular. O envio usa o **Brevo** (gratuito, 300 e-mails por dia):

1. Crie a conta em brevo.com, confirme o e-mail remetente em **Remetentes** e gere uma chave em **SMTP e API → Chaves de API**.
2. Rode o assistente. Ele confere a chave, envia um e-mail de teste e salva os segredos no Worker:

```bash
npm run email:configurar -- --nuvem
```

O assistente grava `BREVO_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME` e `OWNER_EMAIL` (o único e-mail que pode receber o link de primeiro acesso). Defina também o endereço público usado nos links:

```bash
npx wrangler secret put APP_ORIGIN --name hanne-essencial   # ex.: https://hanne-essencial.SEU-USUARIO.workers.dev
```

### Código de configuração (alternativa sem e-mail)

O **código de configuração** também cria a conta da titular e permite redefinir a senha. Use um valor longo e aleatório (mínimo 16 caracteres) e guarde-o em local seguro, como um gerenciador de senhas:

```bash
npx wrangler secret put SETUP_TOKEN --name hanne-essencial
```

Chave de cifragem das credenciais do WhatsApp (gere uma vez e **nunca troque** depois de conectar o número, ou as credenciais salvas deixam de abrir):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```bash
npx wrangler secret put WHATSAPP_ENCRYPTION_KEY --name hanne-essencial
```

O conector do WhatsApp (Baileys) não precisa de nenhum secret extra: ele roda no computador do ateliê e chama o site com a própria chave. Para receber e enviar **anexos** (fotos e áudios), crie um namespace KV e informe o ID no deploy: `npx wrangler kv namespace create hanne-media` e depois `CLOUDFLARE_KV_MEDIA_ID=<id> npm run deploy:cloudflare`.

### Inteligência artificial

Não precisa de segredo: o deploy liga o **Workers AI** (binding `AI`) automaticamente. O plano gratuito tem 10.000 *neurons* por dia e o sistema limita o uso para caber nisso. Veja `docs/INTELIGENCIA_ARTIFICIAL.md`.

## 5. Primeiro acesso

1. Abra o endereço publicado. Com e-mail configurado, informe o e-mail da titular e abra o link recebido para criar a senha (mínimo 12 caracteres). Sem e-mail, a tela pede o código de configuração.
2. **Trazendo dados da versão anterior:** antes de “Preparar operação”, vá em Configurações → **Restaurar cópia JSON** e escolha o arquivo baixado em “Cópia completa JSON” na versão antiga. A restauração só é aceita com a base vazia.
3. Sem dados anteriores, siga por “Preparar operação”.

Esqueceu a senha? Na tela de login, “Esqueci minha senha” envia um link (válido por 30 minutos) para o e-mail da conta; sem e-mail configurado, pede o código de configuração. A redefinição encerra as sessões abertas em outros aparelhos.

## 6. WhatsApp por QR (Baileys)

O conector roda no computador do ateliê e chama o site (veja `docs/WHATSAPP_NO_COMPUTADOR.md`). Rode o instalador com `-Site` igual ao endereço publicado no passo 3, sem barra no final.

## Atualizações

Depois de mudanças no código, repita o passo 3. As migrações já aplicadas não são repetidas.

## Desenvolvimento local

```bash
npm run dev
```

Para testar o cadastro da titular localmente, crie o arquivo `.dev.vars` (não versionado) com `SETUP_TOKEN=um-codigo-local-de-teste`. Ou crie o usuário de teste direto no banco local com `npm run user:test:create`. Testes: `npm test`.

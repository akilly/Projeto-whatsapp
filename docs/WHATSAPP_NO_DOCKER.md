# Conector do WhatsApp com Docker

O conector (Baileys) precisa ficar ligado o tempo todo. Com Docker ele roda em qualquer máquina que fique ligada, de graça: o computador do ateliê (Docker Desktop), um servidor gratuito (Oracle Cloud Always Free) ou um mini PC. O container reinicia sozinho se a máquina reiniciar.

O QR Code aparece no próprio site (Atendimentos → WhatsApp), não no terminal.

## 1. Pré-requisitos

- Docker instalado (no Windows/Mac: Docker Desktop; no Linux: `docker` e o plugin `docker compose`).
- A pasta `services/baileys` deste repositório na máquina (baixe o repositório ou o arquivo `baileys-conector.zip` do site).

## 2. Configurar

Dentro de `services/baileys`, gere a chave do conector:

```bash
docker run --rm node:22-slim node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Copie `.env.example` para `.env` e preencha:

```
BRIDGE_KEY=a-chave-gerada-acima
SITE_ORIGIN=https://projeto-salao.SEU-SUBDOMINIO.workers.dev
DATA_DIR=/data
```

## 3. Subir

```bash
docker compose up -d
docker compose logs -f     # acompanhar (Ctrl+C só sai do log; o conector continua)
```

Deve aparecer “Conector iniciado” e “Aguardando o ateliê pedir o QR Code”.

## 4. Ligar ao site

1. No site: **Atendimentos → WhatsApp → Conectar por QR Code**.
2. Cole a mesma `BRIDGE_KEY` e confirme.
3. Leia o QR Code com o celular: WhatsApp Business → **Aparelhos conectados → Conectar aparelho**.

## Manutenção

| Ação | Comando |
|---|---|
| Ver se está rodando | `docker compose ps` |
| Parar | `docker compose stop` |
| Atualizar depois de baixar código novo | `docker compose up -d --build` |
| Apagar a sessão do WhatsApp (pede QR de novo) | `docker compose down -v` |

A sessão fica no volume `hanne-whatsapp-data`; atualizar ou recriar o container não desconecta o WhatsApp. Só `down -v` apaga.

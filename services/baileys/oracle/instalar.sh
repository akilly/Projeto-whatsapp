#!/usr/bin/env bash
# Instala (ou atualiza) o conector do WhatsApp do Hanne num servidor Ubuntu (Oracle Cloud Always Free, Google Cloud etc.).
# Uso, dentro do servidor:
#   curl -fsSL https://raw.githubusercontent.com/akilly/Projeto-whatsapp/main/services/baileys/oracle/instalar.sh | bash -s -- https://projeto-salao.SEU-SUBDOMINIO.workers.dev
# Opcional: BRIDGE_KEY=<chave> antes do comando (32+ letras, números, - ou _). Sem ela, uma chave é gerada.
# Rodar de novo atualiza o código e mantém a chave e a sessão do WhatsApp.
set -euo pipefail

REPO_TARBALL="https://codeload.github.com/akilly/Projeto-whatsapp/tar.gz/refs/heads/main"
DIR=/opt/hanne-conector
SITE="${1:-${SITE_ORIGIN:-}}"

say() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
[ "$(id -u)" -eq 0 ] && SUDO="" || SUDO="sudo"

# Endereço do site: argumento, variável ou o que já estava salvo.
if [ -z "$SITE" ] && [ -f "$DIR/.env" ]; then SITE="$(grep -E '^SITE_ORIGIN=' "$DIR/.env" | cut -d= -f2-)"; fi
if [ -z "$SITE" ] && [ -t 0 ]; then read -rp "Endereço do site (ex.: https://projeto-salao.SEU-SUBDOMINIO.workers.dev): " SITE; fi
SITE="${SITE%/}"
if ! printf '%s' "$SITE" | grep -Eq '^https://[a-z0-9.-]+$'; then
  echo "Informe o endereço do site começando com https:// (sem barra no final)." >&2; exit 1
fi

say "1/5 Memória extra (swap) para máquinas pequenas"
if [ "$(awk '/MemTotal/ {print $2}' /proc/meminfo)" -lt 2000000 ] && ! $SUDO swapon --show | grep -q /swapfile; then
  $SUDO fallocate -l 2G /swapfile || $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048
  $SUDO chmod 600 /swapfile && $SUDO mkswap /swapfile >/dev/null && $SUDO swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab >/dev/null
  echo "Swap de 2 GB ativado."
else echo "Não precisa."; fi

say "2/5 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | $SUDO sh
fi
$SUDO systemctl enable --now docker >/dev/null 2>&1 || true
docker compose version >/dev/null 2>&1 || $SUDO docker compose version >/dev/null

say "3/5 Código do conector"
TMP="$(mktemp -d)"
curl -fsSL "$REPO_TARBALL" | tar -xz -C "$TMP"
$SUDO mkdir -p "$DIR"
$SUDO cp -r "$TMP"/*/services/baileys/. "$DIR"/
rm -rf "$TMP"

say "4/5 Configuração"
if printf '%s' "${BRIDGE_KEY:-}" | grep -Eq '^[A-Za-z0-9_-]{32,160}$'; then
  KEY="$BRIDGE_KEY"
  echo "Chave informada na instalação."
elif [ -f "$DIR/.env" ] && grep -Eq '^BRIDGE_KEY=.{20,}' "$DIR/.env"; then
  KEY="$(grep -E '^BRIDGE_KEY=' "$DIR/.env" | cut -d= -f2-)"
  echo "Chave existente mantida."
else
  KEY="$(head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n')"
  echo "Chave nova gerada."
fi
printf 'BRIDGE_KEY=%s\nSITE_ORIGIN=%s\nDATA_DIR=/data\n' "$KEY" "$SITE" | $SUDO tee "$DIR/.env" >/dev/null
$SUDO chmod 600 "$DIR/.env"

say "5/5 Subindo o conector"
cd "$DIR"
$SUDO docker compose up -d --build
sleep 5
$SUDO docker compose logs --tail 5

cat <<MSG

==================================================================
 Conector rodando e configurado para reiniciar sozinho.

 Agora, no site ($SITE):
   Atendimentos → WhatsApp → Conectar por QR Code
   Cole esta chave do conector:

   $KEY

 Depois leia o QR Code no celular:
   WhatsApp Business → Aparelhos conectados → Conectar aparelho

 Ver o andamento:  cd $DIR && sudo docker compose logs -f
 Atualizar:        rode este mesmo comando de instalação de novo.
==================================================================
MSG

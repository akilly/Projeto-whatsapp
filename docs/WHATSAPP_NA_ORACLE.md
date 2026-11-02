# Conector do WhatsApp na nuvem gratuita (Oracle Cloud Always Free)

Deixa o WhatsApp do Hanne conectado 24 horas, sem depender do computador do ateliê, num servidor gratuito da Oracle. O conector só faz chamadas de saída para o site: não é preciso abrir portas nem configurar firewall.

Você vai precisar de:

- o endereço do site, por exemplo `https://projeto-salao.SEU-SUBDOMINIO.workers.dev`;
- uma **chave do conector**: 32 a 160 caracteres, só letras, números, `-` ou `_`. Gere no navegador (qualquer gerador de senhas sem símbolos) ou com `openssl rand -hex 24`. Guarde-a: ela vai no servidor e no site.

## 1. Criar a conta (uma vez)

1. Acesse oracle.com/cloud/free e clique em **Comece gratuitamente**.
2. Preencha os dados. Escolha a **região inicial (Home Region)** com cuidado, porque ela não muda depois: **Brazil East (São Paulo)** ou **Brazil Southeast (Vinhedo)**.
3. Cadastre o cartão: é só para verificar a identidade. Não faça upgrade para conta paga.

## 2. Criar o servidor gratuito

No painel: **Menu → Computação → Instâncias → Criar instância**.

1. **Nome:** `hanne-whatsapp`.
2. **Imagem e forma → Editar:**
   - Imagem: **Canonical Ubuntu 24.04**.
   - Forma: **Ampere → VM.Standard.A1.Flex** com **1 OCPU e 6 GB** (dentro do gratuito). Se aparecer “Out of capacity”, use **Specialty and previous generation → VM.Standard.E2.1.Micro** (também gratuita).
   - Confira a etiqueta **Always Free-eligible**.
3. **Rede:** deixe o padrão (criar nova VCN e sub-rede pública, com IP público).
4. **Chaves SSH:** deixe **Gerar par de chaves** e baixe a chave privada (só será usada se um dia precisar entrar no servidor).
5. **Mostrar opções avançadas → Gerenciamento → Script de inicialização (cloud-init) → Colar script** e cole, trocando as duas linhas marcadas:

```bash
#!/bin/bash
export BRIDGE_KEY="COLE-AQUI-A-CHAVE-DO-CONECTOR"
SITE="https://projeto-salao.SEU-SUBDOMINIO.workers.dev"
curl -fsSL https://raw.githubusercontent.com/akilly/Projeto-whatsapp/main/services/baileys/oracle/instalar.sh | bash -s -- "$SITE" > /var/log/hanne-instalacao.log 2>&1
```

6. **Criar**. A instalação acontece sozinha nos primeiros 5 a 10 minutos depois que a máquina liga.

## 3. Ligar ao site

1. No site: **Configurações → WhatsApp → Conectar por QR Code**.
2. Cole a **mesma chave do conector** e confirme.
3. Em até um minuto aparece o QR Code. No celular: **WhatsApp Business → Aparelhos conectados → Conectar aparelho**.

Pronto: o status muda para “WhatsApp conectado”.

## Se o QR Code não aparecer

Espere 10 minutos depois de criar a instância. Se continuar em “Aguardando o conector”, entre no servidor pelo navegador: na página da instância, **Console → Cloud Shell** (ou por SSH com a chave baixada, usuário `ubuntu`) e veja:

```bash
sudo tail -30 /var/log/hanne-instalacao.log
cd /opt/hanne-conector && sudo docker compose logs --tail 30
```

Para instalar à mão (mesmo resultado do cloud-init):

```bash
curl -fsSL https://raw.githubusercontent.com/akilly/Projeto-whatsapp/main/services/baileys/oracle/instalar.sh | BRIDGE_KEY="sua-chave" bash -s -- https://projeto-salao.SEU-SUBDOMINIO.workers.dev
```

## Manutenção

- **Atualizar o conector:** rode o comando de instalação manual de novo. A chave e a sessão do WhatsApp são mantidas.
- **Não deixe a conta parada:** a Oracle pode encerrar contas sem acesso por mais de 30 dias. Entre no painel uma vez por mês.
- **Custo:** zero, desde que a instância use uma forma marcada como Always Free e a conta não seja convertida para paga.

# Manual do Hanne

Guia completo para o dia a dia do ateliê: atender pelo WhatsApp, responder sozinho o que se repete, montar orçamentos, lembrar tarefas e cuidar do estoque.

> **Em uma frase:** o Hanne junta as conversas do seu WhatsApp, mostra o que cada cliente quer (com prioridade) e deixa tudo pronto para você responder, orçar e acompanhar. Nada é enviado à cliente sem você tocar em enviar, exceto as mensagens automáticas que você mesma ligar.

## Sumário

1. [Primeiros passos](#1-primeiros-passos)
2. [Visão geral](#2-visão-geral)
3. [Conectar o WhatsApp](#3-conectar-o-whatsapp)
4. [Atendimentos](#4-atendimentos)
5. [Automação](#5-automação)
6. [Orçamentos](#6-orçamentos)
7. [Tarefas](#7-tarefas)
8. [Estoque](#8-estoque)
9. [Serviços](#9-serviços)
10. [Configurações](#10-configurações)
11. [Excluir registros](#11-excluir-registros)
12. [Dicas de uso](#12-dicas-de-uso)
13. [Problemas comuns](#13-problemas-comuns)
14. [Glossário](#14-glossário)

---

## 1. Primeiros passos

### Entrar

Abra o endereço do ateliê no navegador, digite o **e-mail** e a **senha**. No primeiro acesso, use o link recebido por e-mail (ou o código de configuração) para criar sua senha. A senha precisa ter pelo menos 12 caracteres.

### Conhecer a tela

| Onde | O que tem |
|---|---|
| **Menu lateral** (no celular: barra de baixo e botão ☰) | Visão geral, Atendimentos, Orçamentos, Tarefas, Estoque, Serviços, Automação, Configurações e Ajuda. |
| **Busca** (topo, atalho `Ctrl + K` ou `⌘ K`) | Encontra conversas, orçamentos, tarefas, serviços e produtos de uma vez. |
| **Claro / Escuro** (topo) | Troca o tema. A escolha fica salva neste aparelho. |
| **Sino** (topo) | Junta os alertas que pedem atenção. |
| **Modo de foco** (menu lateral) | Esconde distrações. As prioridades continuam visíveis. |
| **Como usar esta tela** (abaixo do título de cada página) | Resumo curto do que a tela faz. |

### Usar no celular

O Hanne funciona no navegador do celular. Na barra de baixo ficam os atalhos principais; o botão **Mais** abre o resto. Em Atendimentos, tocar numa conversa abre a conversa em tela cheia, e a seta ← volta para a lista.

> **Dica:** adicione o site à tela inicial do celular pelo menu do navegador para abrir com um toque.

### Salvamento

Orçamentos, tarefas, estoque e serviços são salvos no servidor quando você confirma. Se não conseguir salvar, o sistema avisa e mantém o que você digitou na tela para você tentar de novo; confira o indicador de sincronização antes de sair. As conversas do WhatsApp ficam no servidor e continuam chegando mesmo com o site fechado.

---

## 2. Visão geral

A primeira tela mostra o que merece atenção hoje:

- **Atendimentos pendentes:** quantas conversas do WhatsApp ainda não foram resolvidas. Toque para abrir a caixa de conversas.
- **Orçamentos em andamento:** os que faltam informações ou estão em avaliação.
- **Tarefas para hoje** e **atrasadas.**
- **Estoque baixo:** produtos com saldo igual ou abaixo do mínimo.

O atalho **Novo orçamento** e **Nova tarefa** fica no topo da tela.

---

## 3. Conectar o WhatsApp

O Hanne usa o número do seu **WhatsApp Business** por meio de um pequeno programa chamado **conector**, que fica ligado 24 horas (em um servidor gratuito da Oracle ou no computador do ateliê) e conversa com o site. A instalação do conector é feita uma única vez; o passo a passo está em [WHATSAPP_NA_ORACLE.md](WHATSAPP_NA_ORACLE.md).

> **Onde fica:** toda a conexão (chave, QR Code, reconectar, trocar de número e desconectar) está em **Configurações → WhatsApp**. A tela de Atendimentos só mostra o estado e, quando preciso, um botão **Abrir Configurações**.

### Primeira conexão

1. Instale o conector e anote a **chave do conector** (letras, números, `-` ou `_`; 32 a 160 caracteres).
2. Vá em **Configurações → WhatsApp → Conectar por QR Code**.
3. Cole a chave, marque a confirmação e toque em **Preparar QR Code**.
4. Em até um minuto aparece o QR Code, ali mesmo em Configurações. No celular: **WhatsApp Business → Aparelhos conectados → Conectar aparelho** e leia o código.
5. Quando o status mudar para **WhatsApp conectado** (e o número aparecer ao lado), já pode atender em Atendimentos.

> **Importante:** o QR Code é temporário e privado. Se expirar, toque em **Gerar novo QR Code**.

### A chave é pedida só uma vez

A chave fica **guardada com segurança (cifrada)** e **não é pedida de novo**, nem ao desconectar e reconectar. Ela só aparece em Configurações, em **Usar outra chave**, e só serve quando você reinstala o conector e ele ganha uma chave nova.

### Desconectar e reconectar o mesmo número

1. Em **Configurações → WhatsApp**, toque em **Desconectar** e confirme.
2. O status passa a **WhatsApp desconectado** e o número aparece apenas como **Último número**. Em Atendimentos o número deixa de aparecer.
3. Para ligar de novo, toque em **Reconectar o número …** e leia o novo QR Code.

> **Atenção:** desconectar encerra a sessão do aparelho no conector, mas **não apaga** as conversas já recebidas nem sai do WhatsApp Business do celular.

### Trocar para outro número

Com o WhatsApp desconectado, em **Configurações → WhatsApp**:

1. Toque em **Trocar de número** e confirme.
2. As conversas do número antigo **somem da lista e ficam guardadas** no sistema. Nada é apagado.
3. Leia o QR Code do número novo. A caixa de conversas começa vazia.
4. Se um dia você reconectar o número antigo, as conversas dele **voltam**. Os números guardados aparecem em Configurações, em "Conversas guardadas de outros números".

Cada conta do Hanne usa **um número por vez**. Para dois números ao mesmo tempo, use um salão (conta) separado para cada um.

### Número vinculado

Sem trocar de número, o sistema só aceita o número já vinculado. Se alguém ler o QR com outro número, a conexão avisa e pede para você desconectar e usar **Trocar de número**.

---

## 4. Atendimentos

Aqui ficam as conversas reais do número conectado, com a aparência do próprio WhatsApp. A tela se atualiza sozinha: a nova mensagem aparece em poucos segundos, sem precisar recarregar. Se o WhatsApp estiver desconectado, o topo avisa e mostra o botão **Abrir Configurações**.

### 4.1 A lista de conversas

Cada linha mostra:

- **Foto/iniciais** da cliente e o **nome** (o nome salvo no seu celular; se não houver, o nome do perfil do WhatsApp; se também não houver, o número).
- A **prévia** da última mensagem, com as marcas de entrega nas suas respostas (✓ enviada, ✓✓ entregue, ✓✓ azul lida).
- A **hora** (hoje), "Ontem", o dia da semana ou a data.
- Uma **bolinha verde** com o número de mensagens não lidas.
- O **assunto** (etiqueta colorida) e, quando for o caso, **Prioridade alta**.
- O resumo do que a cliente quer (a "solicitação"), escrito pela IA.

**Filtros de situação:** Pendentes, Não lidas, Todas e Resolvidas.

**Assuntos:** logo abaixo ficam botões com cada assunto e a quantidade de conversas. Toque num assunto para ver só aquele. **Separar por assunto** agrupa a lista em blocos coloridos, na ordem definida em [Automação → Assuntos](#53-assuntos-e-prioridade).

**Busca:** procure por nome, número ou trecho de mensagem.

### 4.2 Assunto e prioridade

A IA lê cada mensagem nova, escolhe o **assunto** e dá uma **prioridade**:

| Prioridade | Como aparece | Quando |
|---|---|---|
| **Alta** | Etiqueta "Prioridade alta" e destaque | Segurança, Agendamento urgente (até 3 dias depois da mensagem), Pagamento pendente e Pagamento realizado. |
| **Normal** | Sem etiqueta | Agendamento comum e os assuntos definidos como Normal. |
| **Baixa** | Sem destaque | Spam ou suspeita. |
| **A IA decide** | Alta, normal ou baixa conforme o resumo da cliente | Os demais assuntos (orçamento, pós-procedimento, reclamação etc.). |

Enquanto a cliente só cumprimentou ("oi", "bom dia"), a conversa fica como **Ainda não disse o que precisa**. A prioridade de cada assunto você ajusta em [Automação](#53-assuntos-e-prioridade).

> **Segurança:** quando o assunto é Segurança (reação alérgica, ardência, queimadura, dor), aparece um aviso vermelho: avalie pessoalmente antes de orientar a cliente.

**Trocar o assunto à mão:** no seletor **Assunto** no topo da conversa (no celular, no menu ⋮). Escolha um assunto, ou **Assunto pela IA** para voltar ao automático. Quando você escolhe, a IA não muda mais aquela conversa.

### 4.3 Dentro da conversa

Na parte de cima fica a **faixa de solicitação**: o que a cliente quer agora, o assunto e avisos (por exemplo, "Aviso de ocupada enviado às 10:32"). A IA atualiza a cada mensagem nova.

Abaixo, as **Ferramentas** (toque para abrir):

- **Resumo da conversa:** a IA resume o que a cliente pediu e o que falta responder.
- **Sugestão de resposta:** a IA escreve um rascunho no campo de resposta. Você revisa, edita e envia.
- **Orçamentos e tarefas:** mostra o que já foi criado a partir da conversa. **Criar orçamento** e **Criar tarefa** levam o nome, o telefone e a origem já preenchidos.

No topo à direita: **Resolver / Reabrir** e o menu **⋮** (Criar orçamento, Criar tarefa, Excluir conversa).

> **Resolver** só organiza a sua lista. Uma nova mensagem da cliente reabre a pendência automaticamente.

### 4.4 Responder

| Quero | Como fazer |
|---|---|
| Enviar texto | Escreva e aperte **Enter** (computador) ou o botão de enviar. **Shift + Enter** quebra a linha. No celular, Enter quebra a linha e o botão envia. |
| Usar emoji | Botão 😊 à esquerda do campo. |
| Enviar foto | Clipe 📎 → **Foto** (JPEG ou PNG, até 5 MB). Também dá para colar ou arrastar a imagem para a conversa. A legenda é o texto do campo. |
| Enviar áudio gravado | Botão do microfone: grava na hora (precisa permitir o microfone). Toque em enviar para mandar ou na lixeira para descartar. |
| Enviar arquivo de áudio | Clipe 📎 → **Arquivo de áudio** (MP3, M4A, AAC, AMR ou OGG, até 16 MB). Áudio vai sem legenda. |
| Responder citando | Passe o mouse (ou toque) numa mensagem e use a seta de **Responder**. A mensagem citada aparece acima do campo. |
| Copiar o texto | Botão de copiar na mensagem. |

As mensagens que saem mostram o relógio enquanto aguardam o conector. Se o conector estiver fora do ar, a mensagem **fica na fila** e sai sozinha quando ele voltar.

> **Atenção:** se aparecer "Envio sem confirmação", não reenvie por outro lugar antes de conferir no celular. Use **Já conferi no celular** para liberar o campo.

### 4.5 Nota interna

É o seu caderninho dentro da conversa: um registro do que você está fazendo, **que a cliente nunca recebe**.

1. Acima do campo de resposta, toque em **Nota interna** (o campo fica amarelo).
2. Escreva e aperte **Enter** ou o botão de salvar.
3. A nota aparece como um **balão amarelo** com "Nota interna · só você vê".
4. Para voltar a escrever para a cliente, toque em **Mensagem**.

Exemplos: "Cliente prefere sábado de manhã", "Pediu desconto, ver com a dona", "Ficou de mandar foto do cabelo". As notas entram no resumo da IA, para ela saber o contexto.

### 4.6 Nova conversa

Para falar com alguém que ainda não escreveu:

1. Toque em **Nova conversa** (topo da página).
2. Informe o **nome** (opcional) e o **telefone com DDD**.
3. Escreva a mensagem e toque em **Enviar pelo WhatsApp**.

A conversa nasce na lista e a resposta da cliente chega nela. Ela **não** vira pendência até a cliente responder.

### 4.7 Estou ocupada

No topo da caixa fica o seletor **Estou ocupada**. Ligado, quem disser o que precisa recebe o aviso de que você responde assim que possível. O texto e o tempo de espera ficam em [Automação](#5-automação).

### 4.8 Excluir uma conversa ou mensagem

No menu **⋮**, **Excluir conversa**, ou o ícone de lixeira em uma mensagem. Isso apaga o conteúdo **só do sistema**. Não apaga do celular da cliente nem do WhatsApp. Uma nova mensagem poderá criar a conversa de novo.

---

## 5. Automação

No menu **Automação** você define o que o sistema responde sozinho e como as conversas são separadas.

### 5.1 Mensagens automáticas

Cada automação é um **cartão** com o nome, o gatilho, o tempo de espera, a mensagem e um **seletor Ligada/Desligada**. Ligar ou desligar vale na hora. Toque em **Editar** para mudar o que quiser.

**Já vêm prontas:**

| Automação | Gatilho | Estado inicial |
|---|---|---|
| **Boas-vindas** | A cliente só cumprimenta | Ligada (espera 2 minutos) |
| **Estou ocupada** | A cliente diz o que precisa | Desligada |
| **Fora do horário** | Chega fora do horário de atendimento | Desligada |
| **Pagamento recebido** | O assunto é Pagamento realizado | Desligada |

### 5.2 Criar uma automação nova

1. Toque em **Nova automação**.
2. Escolha um **modelo** pronto (Endereço, Boas-vindas a contato novo, Formas de pagamento, Pagamento pendente) ou **Em branco**.
3. Ajuste o **nome**, o **gatilho** (Quando), o **tempo de espera** e a **mensagem**. A **prévia** mostra como a cliente vai ver.
4. Toque em **Criar automação**. Ela já nasce ligada.

**Gatilhos disponíveis:**

| Gatilho | Dispara quando | Campo extra |
|---|---|---|
| A cliente só cumprimenta | Mandou só "oi", "bom dia", "tudo bem?" e ainda não disse o que quer | — |
| A cliente diz o que precisa | A IA entendeu o pedido | — |
| A conversa é de um assunto | A conversa entra num assunto da lista | Qual assunto |
| A mensagem tem certas palavras | A mensagem contém uma das palavras | Palavras separadas por vírgula (sem diferença de maiúsculas ou acentos) |
| Chega fora do horário | A mensagem chega fora dos dias e horas de atendimento | Dias e horário (início e fim) |
| Contato novo | É a primeira mensagem de alguém que nunca escreveu | — |

**Na mensagem**, use `{nome}` (botão **+ Nome da cliente**) para o primeiro nome. Quando não houver nome, ele some e a frase continua natural.

**Tempo de espera:** de "na hora" até 30 minutos, contado a partir da última mensagem da cliente. Isso evita responder no meio de quem ainda está digitando.

### 5.3 Assuntos e prioridade

Na parte de baixo ficam os **assuntos** que a IA usa para separar as conversas. Cada linha tem:

- **Nome** do assunto.
- **Prioridade:** Alta, Normal, Baixa ou **A IA decide**.
- **Cor.**
- **Quando usar:** uma frase que ajuda a IA a escolher.
- Setas **↑ ↓** para mudar a ordem (é a ordem dos grupos na lista) e **✕** para remover.

**Assuntos que já vêm prontos:**

| Assunto | Prioridade |
|---|---|
| Segurança | Alta |
| Agendamento urgente (até 3 dias depois da mensagem) | Alta |
| Agendamento | Normal |
| Pagamento pendente | Alta |
| Pagamento realizado | Alta |
| Pós-procedimento | A IA decide |
| Orçamento | A IA decide |
| Informações gerais | A IA decide |
| Reclamação | A IA decide |
| Exige esclarecimentos | A IA decide |
| Spam ou suspeita | Baixa |

Use **Adicionar assunto** para criar os seus. Toque em **Salvar assuntos** para guardar (o botão só habilita quando há mudança). **Restaurar a lista padrão** volta ao que está na tabela acima e pede confirmação.

O seletor **IA ligada/desligada** controla se a IA separa as conversas. Desligada, as conversas ficam sem assunto automático (você ainda pode escolher à mão).

### 5.4 Regras de envio (para não incomodar a cliente)

- Cada automação sai **no máximo uma vez por atendimento**. Um atendimento novo começa quando a cliente volta a escrever depois de **8 horas** sem conversa.
- Se **você já respondeu** (pelo sistema ou pelo celular), nenhuma automação é enviada naquele atendimento.
- Depois que uma automação sai, a próxima só pode sair quando a cliente escrever de novo.
- Conversas classificadas como **spam** não recebem automação.
- As mensagens automáticas aparecem na conversa com a etiqueta **Automática** e o nome da regra.
- As automações saem **mesmo com o site fechado**, desde que o conector esteja ligado.

> **Dica:** comece com **Boas-vindas** e **Estou ocupada**. Depois crie uma de **Endereço** com palavras-chave: ela responde sozinha a quem pergunta "onde fica?".

---

## 6. Orçamentos

Cada orçamento guarda **contato**, **serviço**, **etapa**, **valor**, **contexto** (histórico e o que falta saber), **perguntas para a cliente** e até **3 fotos**.

**Etapas:** Faltam informações → Em avaliação → Avaliado → Encerrado. Para marcar como **Avaliado**, defina o valor.

Como criar:

- Pelo botão **Novo orçamento** (Visão geral ou Orçamentos), ou
- Dentro de uma conversa, com **Criar orçamento**: o contato e a origem já vêm preenchidos.

Ferramentas na ficha:

- **Perguntas pelo WhatsApp:** abre a mensagem pronta com as perguntas para você revisar e enviar.
- **Copiar perguntas:** copia o texto.
- **Criar tarefa:** gera um lembrete ligado ao orçamento.
- **Abrir conversa:** volta para a conversa de origem.

Use os filtros no topo (Todos, Em andamento, Faltam informações etc.) para achar rápido. **Exportar** gera uma planilha.

> A definição do procedimento e do preço é sempre sua. As fotos são organizadas sem análise visual por IA.

---

## 7. Tarefas

Lembretes com **título**, **prazo**, **prioridade** (Alta, Média, Baixa) e **área**.

- Toque no **círculo** para concluir. A tarefa vai para o filtro **Concluídas**.
- Filtros: **Pendentes**, **Atrasadas**, **Concluídas** e **Todas**.
- Prazo vencido e não concluída aparece como **atraso**.
- A tarefa pode guardar o **contato**, o **orçamento** e a **conversa** de origem.

Crie pelo botão **Nova tarefa**, ou dentro de uma conversa com **Criar tarefa** ("Responder Maria" já vem preenchido).

---

## 8. Estoque

Controle simples do que você tem, usa e precisa repor. Tudo é lançado à mão, quando acontece.

1. **Cadastrar produto:** nome, marca, unidade (**g**, **ml** ou **un**), tamanho da embalagem, preço da embalagem (opcional), quantidade que você tem hoje e **estoque mínimo**.
2. **Entrada:** quando chega produto. O valor pago é opcional; com ele o **custo médio** é atualizado.
3. **Uso:** quando você usa o produto. **Perda:** quando algo se perde ou estraga. Ambos reduzem o saldo.
4. **Conferir custo:** informe o preço atual quando o custo aparecer como **a conferir**.

**Custo a conferir** significa que falta informação de custo: não é tratado como custo zero.

Corrigir um movimento recalcula o saldo e o custo das saídas seguintes. Produtos com saldo **igual ou abaixo do mínimo** aparecem como **Repor** e na Visão geral.

---

## 9. Serviços

O catálogo do ateliê: **nome**, **descrição**, **duração**, **produtos usados** e **orientações antes e depois** do procedimento.

- Os serviços aparecem na escolha do orçamento.
- As orientações ajudam a responder às clientes.
- Se um serviço for excluído, os orçamentos antigos guardam o nome dele.

---

## 10. Configurações

| Seção | O que faz |
|---|---|
| **Aparência** | Claro ou escuro suave, salvo neste aparelho. |
| **Seu ateliê** | Como prefere ser chamada e o prazo de resposta de referência (em minutos). |
| **Sua conta** | Trocar e-mail (pede a senha atual) e trocar senha (os outros aparelhos precisam entrar de novo). **Sair da conta.** |
| **WhatsApp** | Conectar, ler o QR Code, reconectar, trocar de número e desconectar. Aqui (e só aqui) fica a chave do conector. |
| **Salões** | Para a titular: convidar outro salão. Cada salão tem login e dados próprios, e nenhum vê os dados do outro. O convite vale 7 dias e só pode ser usado uma vez. |
| **Conexões e acesso** | Estado da sincronização, do WhatsApp e da inteligência artificial. |
| **Exportar e cópia** | **Exportar dados** (CSV ou PDF) e **Cópia completa JSON** com todos os registros. |
| **Histórico de ações** | As alterações confirmadas, com data e quem fez. |

### Inteligência artificial

A IA classifica conversas, resume e sugere respostas. Ela **só sugere**: nada é enviado sem você. O plano gratuito tem um limite diário; quando acaba, aparece o aviso e a IA volta no dia seguinte. Enquanto isso, o resto do sistema segue funcionando (você pode escolher o assunto à mão).

---

## 11. Excluir registros

Use **Excluir registro** no topo de cada tela, ou o botão dentro da ficha. Antes de apagar, o sistema mostra **o que será apagado** e **o que só perde o vínculo**, e pede a **senha da conta**. A exclusão é definitiva.

---

## 12. Dicas de uso

- **Tocar fora fecha:** menus, o painel de emojis, a ajuda da tela e as janelas fecham com **um toque fora** (ou **Esc** no computador).
- **Confirmação ao sair:** se você escreveu algo e tentar fechar ou sair, o sistema pergunta se quer **continuar editando** ou **descartar**. Isso vale para janelas com campos preenchidos, para a página Automação com alterações e para o texto de uma nova conversa.
- **Rascunhos:** o texto que você começou a escrever numa conversa fica guardado enquanto a página estiver aberta, mesmo trocando de conversa. Ele não é salvo no aparelho depois que você fecha a aba.
- **Enter envia** no computador; **Shift + Enter** quebra a linha.
- **Busca global** com `Ctrl + K`.
- **Atualizar** (botão na caixa de conversas) confere a conexão e as conversas na hora.

---

## 13. Problemas comuns

### A mensagem da cliente não chegou

1. Veja o status no topo de Atendimentos: **WhatsApp conectado** (verde) ou **Conectando…**. Se estiver desconectado, abra Configurações → WhatsApp.
2. Se aparecer "O conector do computador não se comunica", confira se o servidor do conector está ligado e com internet.
3. Toque em **Atualizar**.

### Aparece "Aguardando o conector" e o QR não vem

Espere alguns minutos depois de instalar ou reiniciar o conector. Se continuar, em **Configurações → WhatsApp** toque em **Gerar novo QR Code** e confira o conector (veja [WHATSAPP_NA_ORACLE.md](WHATSAPP_NA_ORACLE.md), seção "Se o QR Code não aparecer").

### O QR Code expirou

Em **Configurações → WhatsApp**, toque em **Gerar novo QR Code** e leia de novo.

### Desconectei e o número antigo continua aparecendo

Depois de **Desconectar**, o número deixa de ser o número da conexão e aparece só como **Último número**, em Configurações. Para usar outro número, toque em **Trocar de número**.

### A chave foi pedida de novo

Ela só é pedida em Configurações, na primeira conexão ou quando você escolhe **Usar outra chave** (por exemplo, depois de reinstalar o conector).

### Os clientes veem um aviso de versão do WhatsApp

O conector procura sozinho a versão mais recente do WhatsApp e se atualiza uma vez por dia no servidor gratuito. Se o aviso continuar aparecendo para as clientes, reinstale ou reinicie o conector para forçar a atualização e leia o QR Code de novo. Se persistir, anote o texto exato do aviso e envie para o suporte.

### A mensagem automática não saiu

Confira:

1. A automação está **Ligada**?
2. A cliente já tinha uma resposta sua **no mesmo atendimento**?
3. Já saiu uma automação nesse atendimento (cada uma sai uma vez)?
4. Passou o **tempo de espera** configurado?
5. O conector está online?

### A IA parou de classificar

O limite diário gratuito acabou. Ela volta no dia seguinte (a mensagem informa o horário). Escolha o assunto à mão enquanto isso.

### Digitei uma nota e a cliente recebeu?

Não. Nota interna nunca é enviada. Ela é identificada pelo balão amarelo e pelo texto "só você vê".

---

## 14. Glossário

| Termo | Significado |
|---|---|
| **Conector** | Programa que mantém o WhatsApp Business ligado ao site, 24 horas. |
| **Chave do conector** | Senha do conector. Guardada cifrada no sistema; você cola uma vez, em Configurações. |
| **Trocar de número** | Guarda as conversas do número atual e abre um espaço novo para outro número. |
| **Atendimento** | Uma sequência de conversa. Um novo começa quando a cliente volta depois de 8 horas. |
| **Solicitação** | O resumo do que a cliente quer agora, escrito pela IA. |
| **Assunto** | A categoria da conversa (Pagamento, Agendamento, Segurança…). |
| **Prioridade** | Alta, normal ou baixa. Define o que olhar primeiro. |
| **Automação** | Resposta que o sistema envia sozinho quando uma condição acontece. |
| **Gatilho** | A condição que faz uma automação disparar. |
| **Nota interna** | Registro dentro da conversa que a cliente não recebe. |
| **Pendente** | Conversa ainda não resolvida. |
| **Custo a conferir** | Falta saber o custo de um produto; não conta como zero. |

---

*Este manual acompanha a versão atual do Hanne. A ajuda curta de cada tela ("Como usar esta tela") traz o essencial no próprio sistema.*

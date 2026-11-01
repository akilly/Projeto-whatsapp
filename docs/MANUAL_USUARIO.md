# Manual da usuária · Hanne Essencial

O Hanne Essencial reúne o que acontece no atendimento: conversas, orçamentos, tarefas, estoque e o catálogo de serviços. Não tem agenda, cadastro de clientes nem financeiro.

## Entrar

Abra o endereço do ateliê, digite o e-mail e a senha. No primeiro acesso, use o link recebido por e-mail ou o código de configuração. Para ver como tudo funciona sem mexer nos seus dados, use **Dados reais · ver demonstração** no menu.

## Visão geral

Mostra o que precisa de atenção: atendimentos pendentes (WhatsApp e notas), orçamentos em andamento, tarefas para hoje e atrasadas, e produtos com estoque baixo. O sino no topo junta os alertas prioritários.

## Automação

No menu **Automação**:

- **Boas-vindas automática:** se a cliente só cumprimentar ("oi", "bom dia") e não disser o que precisa, depois do tempo escolhido (padrão: 2 minutos) o sistema pergunta como pode ajudar. Use `{nome}` no texto para o primeiro nome.
- **Estou ocupada:** com o seletor ligado, depois que a cliente diz o que quer, ela recebe o aviso. Também há o seletor na caixa do WhatsApp.
- **Assuntos das conversas:** lista (nome, cor e quando usar) que a IA usa para separar as conversas. A ordem da lista é a ordem dos grupos.

Cada mensagem automática sai uma vez por atendimento (um atendimento começa quando a cliente volta a escrever depois de 8 horas sem conversa). Se você já respondeu, pelo sistema ou pelo celular, nada automático é enviado. As mensagens automáticas aparecem na conversa com a etiqueta **Automática**.

## Atendimentos

São duas abas:

- **WhatsApp:** as conversas reais do número conectado, no jeito do aplicativo. Para ligar, toque em **Conectar por QR Code** e siga o [guia do conector](WHATSAPP_NA_ORACLE.md).
  - **Lista:** nome salvo no seu celular (ou o nome do perfil do WhatsApp), prévia da última mensagem com ✓✓, não lidas em verde, busca e filtros (Pendentes, Não lidas, Todas, Resolvidas). Com **Separar por assunto**, as conversas ficam agrupadas pelos assuntos do painel Automação, cada um com sua cor.
  - **Conversa:** no topo, a **solicitação da cliente** em destaque (a IA atualiza a cada mensagem nova). Troque o assunto à mão no seletor do topo (no celular, no menu ⋮). Em **Ferramentas** ficam o resumo, a sugestão de resposta e os orçamentos e tarefas ligados.
  - **Responder:** Enter envia e Shift+Enter quebra a linha (no celular, use o botão). Há emojis, foto (também colando ou arrastando), arquivo de áudio, áudio gravado na hora (microfone, nos navegadores que gravam em formato aceito pelo WhatsApp), responder citando uma mensagem e copiar o texto.
  - **Estou ocupada:** seletor no topo da caixa. Ligado, quem disser o que precisa recebe o aviso de que você responde assim que possível.
- **Notas internas:** para pedidos que chegaram por telefone, Instagram ou pessoalmente. Toque em **Novo atendimento**, informe o nome (o telefone é opcional) e o que a cliente pediu. Depois registre notas internas ou novas mensagens da cliente, classifique, resolva, peça resumo e rascunho à IA e abra o WhatsApp com o texto pronto.

Nada é enviado à cliente sem você tocar em enviar.

## Orçamentos

Cada orçamento tem contato, serviço, etapa, valor, contexto, perguntas e até 3 fotos.

- **Etapas:** Faltam informações → Em avaliação → Avaliado (exige valor) → Encerrado.
- **Perguntas pelo WhatsApp** abre a mensagem pronta com as perguntas, para você revisar e enviar.
- Se o orçamento nasceu de uma conversa, **Abrir conversa** volta para ela.
- **Criar tarefa** gera um lembrete ligado ao orçamento.

## Tarefas

Lembretes com prazo, prioridade e área. Toque no círculo para concluir. Filtros: Pendentes, Atrasadas, Concluídas e Todas. A tarefa pode guardar o contato, o orçamento e a conversa de origem.

## Estoque

1. **Cadastrar produto:** nome, marca, unidade (g, ml ou un), tamanho da embalagem, preço da embalagem (opcional), quantidade que você tem hoje e estoque mínimo.
2. **Registrar entrada:** quando chega produto. O valor pago é opcional; com ele o custo médio é atualizado.
3. **Registrar uso:** quando você usa o produto. **Perda:** quando algo se perde ou estraga.
4. **Conferir custo:** informa o preço atual quando o custo está "a conferir".

Corrigir um movimento recalcula o saldo e o custo das saídas seguintes. Produtos com saldo igual ou abaixo do mínimo aparecem como **Repor**.

## Serviços

O catálogo com nome, descrição, duração, produtos usados e orientações antes e depois. Os serviços aparecem na escolha do orçamento. Se um serviço for excluído, os orçamentos guardam o nome dele.

## Configurações

Nome do ateliê, prazo de resposta de referência, tema, conta (e-mail e senha), salões (titular), conexões (WhatsApp e IA), exportações em CSV ou PDF, cópia completa em JSON e histórico de ações.

## Excluir

Use **Excluir registro** no topo de cada tela ou o botão dentro da ficha. Antes de apagar, o sistema mostra o que será apagado e o que só perde o vínculo, e pede a senha da conta.

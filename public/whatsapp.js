/** Caixa WhatsApp no estilo do aplicativo: lista com prévia, não lidas, busca e assuntos; conversa com bolhas,
 * respostas citadas, emojis, áudio gravado na hora e Enter para enviar. Recursos das notas internas: assunto
 * editável, solicitação da cliente em destaque, resumo e sugestão da IA, orçamentos e tarefas ligados.
 * Atualização: a tela espera por novidades no servidor (/updates) e redesenha só o que mudou, sem substituir
 * o campo de resposta. Rascunhos ficam só em memória.
 */
export function createWhatsAppUI(helpers) {
  const { esc,btn,field,openForm,modal,closeModal,toast,validate,isExample,confirmLeaving,onPending,aiRun,aiContext,onCreate,related,openAutomation }=helpers;
  const aiState=new Map();
  let root=null,timer=null,controller=null,watcher=null,generation=0,loading=false,error='',connection=null,sessionExpired=false;
  let threads=[],pending=null,threadCursor=null,selected='',filter='open',category='',search='',grouped=true,mobileThread=false,older=null,rev=null,automation=null,seenAsked='';
  let recorder=null,recordStart=0,recordTimer=null,recordChunks=[],recordCancel=false;
  const messages=new Map(),drafts=new Map(),cursors=new Map();
  const TZ='America/Sao_Paulo';
  const dayKey=value=>new Date(value).toLocaleDateString('en-CA',{timeZone:TZ});
  const clock=value=>new Date(value).toLocaleTimeString('pt-BR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
  const date=value=>new Date(value).toLocaleString('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  /** Horário na lista: hora (hoje), "Ontem", dia da semana (última semana) ou data. */
  function listTime(value){const d=dayKey(value),today=dayKey(Date.now()),yesterday=dayKey(Date.now()-86400000);if(d===today)return clock(value);if(d===yesterday)return 'Ontem';if(Date.now()-Date.parse(value)<6*86400000)return new Date(value).toLocaleDateString('pt-BR',{timeZone:TZ,weekday:'long'});return new Date(value).toLocaleDateString('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'2-digit'});}
  function dayLabel(key){const today=dayKey(Date.now()),yesterday=dayKey(Date.now()-86400000);if(key===today)return 'Hoje';if(key===yesterday)return 'Ontem';const d=new Date(key+'T12:00:00');return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});}
  const action=(label,name,style='secondary',extra='')=>btn(label,'wa-'+name,'',style,extra);
  const svg=(path,cls='')=>`<svg class="wz-ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const IC={send:'M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z',mic:'M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1a7 7 0 0 0 6-6.9Z',clip:'M16.5 6.5 8.4 14.6a2 2 0 1 0 2.8 2.8l8.1-8.1a4 4 0 0 0-5.7-5.7L5.5 11.7a6 6 0 0 0 8.5 8.5l6.5-6.5',smile:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 18a6 6 0 0 1-5.2-3h10.4A6 6 0 0 1 12 18Z',back:'M15 18l-6-6 6-6',search:'M10.5 4a6.5 6.5 0 1 0 4 11.6l4.4 4.4 1.4-1.4-4.4-4.4A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',close:'M6 6l12 12M18 6 6 18',trash:'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',down:'M6 9l6 6 6-6',reply:'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11Z',copy:'M8 8h11v13H8zM5 16V3h11',dots:'M12 5.5a1.5 1.5 0 1 0 0 .01M12 12a1.5 1.5 0 1 0 0 .01M12 18.5a1.5 1.5 0 1 0 0 .01',spark:'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z',stop:'M7 7h10v10H7z',image:'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5a1 1 0 1 0 0 .01',wave:'M4 12h2M8 8v8M12 5v14M16 8v8M20 12h-2'};
  const draft=()=>{if(!drafts.has(selected))drafts.set(selected,{text:'',file:null,preview:null,operation:null,quote:null});return drafts.get(selected);};
  const statusName={received:'Recebida',queued:'Na fila do conector',sending:'Enviando…',accepted:'Enviada',sent:'Enviada',delivered:'Entregue',read:'Lida',failed:'Não enviada',uncertain:'Sem confirmação'};
  const categories=()=>automation?.categories||[];
  const catColor=name=>categories().find(c=>c.name===name)?.color||'gray';
  const coarse=()=>globalThis.matchMedia?.('(pointer: coarse)').matches;
  /** Avatar com iniciais e cor estável por contato, como no WhatsApp. */
  function avatar(t,size=''){const words=String(t.name||'').replace(/[^\p{L}\p{N}\s]/gu,'').trim().split(/\s+/).filter(Boolean);const letters=(/^\+?\d/.test(t.name)?'':words.slice(0,2).map(w=>w[0]).join('').toUpperCase())||'';let h=2166136261;for(const ch of String(t.peer||t.id))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;h%=360;return `<span class="wz-avatar ${size}" style="--h:${h}" aria-hidden="true">${letters?esc(letters):svg('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0')}</span>`;}
  /** Marcas de entrega (relógio, ✓, ✓✓, ✓✓ azul, alerta). */
  function tick(status){
    if(['queued','sending'].includes(status))return `<span class="wz-tick wait" title="${statusName[status]}" aria-label="${statusName[status]}">${svg('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2')}</span>`;
    if(['failed','uncertain'].includes(status))return `<span class="wz-tick fail" title="${statusName[status]}" aria-label="${statusName[status]}">!</span>`;
    const two=['delivered','read'].includes(status);
    return `<span class="wz-tick ${status==='read'?'read':''}" title="${statusName[status]||'Enviada'}" aria-label="${statusName[status]||'Enviada'}">${svg(two?'M1.5 12.5 6 17l8.5-9M9 15l2 2 8.5-9':'M4 12.5 8.5 17 19 7')}</span>`;
  }
  /** Atualiza só conteúdo alterado e restaura foco em ações equivalentes durante a atualização. */
  function setHTML(node,html){if(!node||node.dataset.html===html)return;const el=node.contains(document.activeElement)?document.activeElement:null,active=el?.dataset.action,id=el?.dataset.id,value=el?.dataset.value;node.innerHTML=html;node.dataset.html=html;if(active)(node.querySelector(`[data-action="${active}"]${id?`[data-id="${CSS.escape(id)}"]`:value!==undefined?`[data-value="${CSS.escape(value)}"]`:''}`)||node.querySelector(`[data-action="${active}"]`))?.focus();}
  /** Erros de sessão preservam o rascunho e oferecem reentrada no nível da página. */
  async function api(path,options={}) {
    let response;
    try{response=await fetch('/api/whatsapp/'+path,{cache:'no-store',signal:options.signal||AbortSignal.timeout(75000),...options,headers:{'X-Atelier-Dataset':isExample()?'example':'real',...options.headers}});}
    catch(e){if(e.name==='AbortError'&&options.signal?.aborted)throw e;throw Error('A rede não confirmou a operação. Atualize ou confira a tentativa para continuar.');}
    let data;try{data=await response.json();}catch{const e=Error('O servidor não confirmou a operação. Atualize para conferir.');e.status=503;throw e;}
    if(!response.ok){if(response.status===401)sessionExpired=true;const e=Error(data.error||'Não foi possível concluir. Tente atualizar.');e.status=response.status;throw e;}
    return data;
  }
  const post=(path,body)=>api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  /** Configuração direta. Nenhum número é registrado ou migrado por este formulário. */
  function configure() {
    if(isExample()){toast('Abra os dados reais para configurar o WhatsApp.');return;}
    const secret=(label,name,help,attributes='')=>`<div class="full wa-secret">${field(label,name,'','password',`required autocomplete="off" aria-describedby="wa-${name}-help" ${attributes}`,true)}${action('Mostrar '+label.toLowerCase(),'reveal','text',`aria-pressed="false" data-label="${esc(label.toLowerCase())}"`)}<p id="wa-${name}-help" class="small muted">${help}</p></div>`;
    openForm('Conectar WhatsApp por QR Code','wa-connect',`<div class="full wa-onboarding"><span class="eyebrow">Conector Baileys</span><ol class="wa-checklist"><li><strong>1. Preparar uma vez</strong><p>Instale o conector (no computador, com Docker ou no servidor gratuito da Oracle) e cole a chave abaixo. Depois disso, não é necessário repetir esta etapa.</p></li><li><strong>2. Ler o QR Code</strong><p>No celular: WhatsApp Business → Aparelhos conectados → Conectar aparelho.</p></li><li><strong>3. Começar a atender</strong><p>Quando aparecer Conectado, envie uma mensagem de outro telefone e responda aqui.</p></li></ol><p><a class="btn secondary sm" href="/baileys-conector.zip" download>Baixar conector e instruções</a></p><p class="notice">Baileys é independente da Meta. Pode sofrer interrupções ou restrições do WhatsApp. Não há garantia de estabilidade nem de ausência de bloqueios.</p></div>${secret('Chave do conector','bridgeKey','O instalador mostra a chave. Ela fica cifrada no sistema; não a envie pelo chat.','minlength="32" maxlength="160" pattern="[a-zA-Z0-9_-]{32,160}"')}<label class="row full small"><input type="checkbox" required>Este conector é exclusivo desta conta e estou ciente de que o Baileys não é uma integração oficial.</label>`,'Preparar QR Code','',true);
  }
  /** O painel mostra etapas observadas, sem simular QR ou mensagem recebida. */
  function setupPanel(){
    if(connection?.provider==='baileys'&&(connection.status==='disconnected'||connection.connected))return '';
    if(connection?.provider==='baileys')return `<section class="card wa-setup"><h3>${connection.qr?'Leia o QR Code':connection.bridgeOnline?'Preparando o QR Code…':'Aguardando o conector'}</h3><p>Abra WhatsApp Business → Aparelhos conectados → Conectar aparelho. Use o mesmo número já vinculado quando houver histórico.</p>${connection.qr?`<img src="${esc(connection.qr)}" width="280" height="280" alt="QR Code temporário para conectar o WhatsApp" style="max-width:100%;height:auto;border-radius:12px"><p class="small muted">Código temporário e privado. Ao expirar, aguarde a próxima atualização.</p>`:''}${action('Gerar novo QR Code','pair-again','primary')}${connection.bridgeOnline?'<p>O conector está online. O código aparece em alguns segundos; se demorar, use Gerar novo QR Code.</p>':'<p>O conector precisa estar ligado e com internet.</p>'}${connection.setupError?`<p role="alert">${esc(connection.setupError)}</p>`:''}</section>`;
    if(connection?.provider!=='meta'||!connection.credentialsVerified)return '';
    const steps=[['Acesso ao número','Token e IDs conferidos na Meta.',true],['Endereço de recebimento',connection.webhookVerifiedAt?'A Meta confirmou o endereço.':'Aguardando confirmação do endereço pela Meta.',!!connection.webhookVerifiedAt],['Mensagem real',connection.lastInbound?'Recebida em '+date(connection.lastInbound)+'.':'Envie uma mensagem do telefone autorizado ao número escolhido.',!!connection.lastInbound]];
    return `<section class="card wa-setup" aria-label="Etapas da conexão Meta"><div class="row between wrap gap8"><div><span class="eyebrow">Meta Cloud API · conexão direta</span><h3>${connection.lastInbound?'Recebimento confirmado':'Conclua o teste de recebimento'}</h3></div>${action('Verificar recebimento','refresh','secondary sm')}</div><ol class="wa-checklist">${steps.map(([label,description,done])=>`<li><span class="wa-step-state">${done?'✓':'○'}</span><div><strong>${label}</strong><p>${esc(description)}</p></div></li>`).join('')}</ol>${connection.setupError?`<p class="notice red">${esc(connection.setupError)}</p>`:''}${!connection.lastInbound?`<details class="wa-manual"><summary>Não chegou mensagem? Confira estas etapas</summary><ol><li>No app da Meta, abra WhatsApp → Configuração / Webhooks. Cadastre os dois valores abaixo e clique em Verificar e salvar.</li><li>Assine o campo <strong>messages</strong>.</li><li>Toque em Inscrever novamente e envie uma mensagem real ao número escolhido.</li></ol><label class="field"><span>URL de retorno (Callback URL)</span><input id="wa-callback-url" readonly value="${esc(connection.callbackURL)}"></label>${action('Copiar URL','copy','text','data-copy="url"')}<label class="field"><span>Token de verificação (Verify token)</span><input id="wa-verify-token" readonly value="${esc(connection.verifyToken)}"></label>${action('Copiar token de verificação','copy','text','data-copy="token"')}${action('Inscrever novamente','retry-connection','secondary')}</details>`:''}</section>`;
  }
  /** Esqueleto estável: barra, lista (busca, filtros e assuntos) e conversa. */
  function shell() {
    const chip=(label,value,attr='filter')=>`<button type="button" class="wz-chip" data-action="wa-${attr}" data-value="${esc(value)}" aria-pressed="false">${label}</button>`;
    return `<section class="wz" aria-label="Atendimento pelo WhatsApp"><div class="wz-toolbar"><div id="wa-status" class="wz-status" role="status" aria-live="polite"></div><div class="wz-toolbar-actions"><div class="wz-busy" role="group" aria-label="Mensagem automática de ocupada"><span class="wz-busy-label" title="Quando ligada, a cliente que disser o que precisa recebe o aviso de que você responde assim que possível.">Estou ocupada</span><div class="theme-control wz-seg"><button type="button" data-action="wa-busy" data-value="false" aria-pressed="true" class="active">Desligada</button><button type="button" data-action="wa-busy" data-value="true" aria-pressed="false">Ligada</button></div></div>${openAutomation?action('Automação','automation','text sm'):''}${action('Atualizar','refresh','secondary sm')}${action('Conectar por QR Code','configure','primary sm')}</div></div><div id="wa-error" class="notice red" role="alert" hidden></div><a id="wa-session" class="btn secondary" href="/" target="_top" hidden>Entrar novamente · copie seu rascunho antes</a><div id="wa-setup-panel"></div><div class="wz-inbox card"><aside class="wz-list" aria-label="Conversas"><div class="wz-list-head"><div class="wz-list-title"><h3>Conversas</h3><span id="wa-pending" class="small muted"></span></div><label class="wz-search">${svg(IC.search)}<span class="sr-only">Buscar conversa</span><input type="search" data-wa-input="search" placeholder="Buscar nome, número ou mensagem" autocomplete="off"></label><div class="wz-chips" role="group" aria-label="Situação">${chip('Pendentes','open')}${chip('Não lidas','unread')}${chip('Todas','all')}${chip('Resolvidas','resolved')}</div><div id="wa-cats" class="wz-chips wz-cats" role="group" aria-label="Assunto"></div><button type="button" class="wz-group-toggle" data-action="wa-group" aria-pressed="true">Separar por assunto</button></div><div id="wa-contacts" class="wz-contacts"></div><div id="wa-more-threads"></div></aside><section class="wz-thread" id="wa-thread"><div class="wz-empty"></div></section></div><p class="small muted wa-footnote">Horários de Brasília. Resolver organiza sua lista; uma nova mensagem reabre a pendência. Enter envia; Shift+Enter quebra a linha.</p></section>`;
  }
  /** Conversas do filtro atual, já com a busca aplicada. */
  function visible(){
    const q=search.trim().toLowerCase(),digits=q.replace(/\D/g,'');
    return threads.filter(t=>(filter==='all'||(filter==='resolved'?t.resolved:filter==='unread'?t.unread>0:!t.resolved))
      &&(!category||(category==='__none'?!t.ai_category||t.ai_intent===0:t.ai_category===category&&t.ai_intent!==0))
      &&(!q||[t.name,t.savedName,t.profileName,t.last_preview,t.ai_request].some(v=>String(v||'').toLowerCase().includes(q))||(digits.length>=3&&String(t.peer).replace(/\D/g,'').includes(digits))));
  }
  /** Assunto da conversa: categoria quando a cliente já disse o que quer; "Sem assunto" enquanto só cumprimentou. */
  const subjectOf=t=>t.ai_intent===0||!t.ai_category?'':t.ai_category;
  function item(t){
    const subject=subjectOf(t),color=subject?catColor(subject):'gray',mine=t.last_direction==='out';
    const prio=t.ai_priority==='alta'&&!t.resolved?'<span class="wz-prio">Prioridade alta</span>':'';
    const tag=subject?`<span class="wz-cat cat-${color}">${esc(subject)}</span>`:t.ai_intent===0?'<span class="wz-cat cat-none">Ainda não disse o que precisa</span>':'';
    return `<button type="button" class="wz-item ${selected===t.id?'active':''} ${t.unread?'unread':''} ${t.resolved?'resolved':''}" data-action="wa-select" data-id="${esc(t.id)}" style="--cat:var(--cat-${color})" ${selected===t.id?'aria-current="true"':''}>${avatar(t)}<span class="wz-item-body"><span class="wz-item-top"><strong class="wz-name">${esc(t.name)}</strong><time datetime="${esc(t.last_at)}">${esc(listTime(t.last_at))}</time></span><span class="wz-item-mid"><span class="wz-preview">${mine&&t.last_status?tick(t.last_status):''}${esc(t.last_preview||t.peer)}</span>${t.unread?`<b class="wz-badge" aria-label="${t.unread} não lidas">${t.unread>99?'99+':t.unread}</b>`:''}</span>${tag||prio||t.ai_request?`<span class="wz-item-tags">${tag}${prio}${t.ai_request&&t.ai_intent!==0?`<span class="wz-req">${esc(t.ai_request)}</span>`:''}</span>`:''}</span></button>`;
  }
  /** Lista agrupada por assunto (na ordem do painel Automação) ou corrida por data. */
  function listHTML(){
    const list=visible();
    if(!list.length)return `<p class="wz-list-empty">${loading&&!threads.length?'Carregando conversas…':error?'Não foi possível atualizar. Use Atualizar para conferir.':search?'Nenhuma conversa encontrada.':filter==='open'?'Nenhuma pendência. Tudo respondido!':'Nenhuma conversa neste filtro.'}</p>`;
    if(!grouped||category)return list.map(item).join('');
    const groups=[...categories().map(c=>({name:c.name,color:c.color,items:list.filter(t=>subjectOf(t)===c.name)})),{name:'Sem assunto ainda',color:'none',items:list.filter(t=>!subjectOf(t)||!categories().some(c=>c.name===t.ai_category))}].filter(g=>g.items.length);
    return groups.map(g=>`<section class="wz-group" aria-label="${esc(g.name)}"><h4 class="wz-group-title cat-${g.color}"><span class="wz-dot"></span>${esc(g.name)}<span class="wz-group-count">${g.items.length}</span></h4>${g.items.map(item).join('')}</section>`).join('');
  }
  function catsHTML(){
    const base=threads.filter(t=>filter==='all'||(filter==='resolved'?t.resolved:filter==='unread'?t.unread>0:!t.resolved));
    const count=name=>base.filter(t=>name==='__none'?!subjectOf(t):subjectOf(t)===name).length;
    const chip=(label,value,color)=>`<button type="button" class="wz-chip cat cat-${color}" data-action="wa-category" data-value="${esc(value)}" aria-pressed="${category===value}"><span class="wz-dot"></span>${esc(label)}<span class="wz-chip-count">${value?count(value):base.length}</span></button>`;
    return chip('Todos os assuntos','','gray')+categories().filter(c=>count(c.name)).map(c=>chip(c.name,c.name,c.color)).join('')+(count('__none')?chip('Sem assunto','__none','none'):'');
  }
  /** Faixa de destaque com a solicitação atual da cliente (atualizada pela IA a cada mensagem nova). */
  function requestHTML(t){
    const subject=subjectOf(t),color=subject?catColor(subject):'none',reading=t.last_inbound&&(!t.ai_at||t.ai_at<t.last_inbound)&&!t.resolved;
    const g=automation?.greeting,b=automation?.busy;
    let label,body,note='';
    if(reading&&!t.ai_request){label='Lendo a mensagem da cliente…';body='A solicitação aparece aqui em alguns segundos.';}
    else if(t.ai_intent===0){label='Ainda não disse o que precisa';body=t.auto_greeted?'Boas-vindas automática enviada às '+clock(t.auto_greeted)+'. Aguardando a resposta da cliente.':g?.enabled?`Se ela não disser o que quer, a boas-vindas sai ${Math.round(g.delay/60)>=1?Math.round(g.delay/60)+' min':g.delay+' s'} após a última mensagem.`:'A boas-vindas automática está desligada no painel Automação.';}
    else{label=(subject||'Solicitação')+(t.ai_priority==='alta'?' · prioridade alta':'');body=t.ai_request||t.ai_reason||'A IA ainda não resumiu o pedido. Use Resumir em Ferramentas.';if(t.auto_busy)note='Aviso de ocupada enviado às '+clock(t.auto_busy)+'.';else if(b?.enabled&&t.last_direction==='in')note='Aviso de ocupada ligado: sai em instantes.';}
    const safety=subject==='Segurança'&&!t.resolved?'<p class="wz-safety">Relato de segurança: avalie pessoalmente o contexto antes de orientar a cliente.</p>':'';
    return `<div class="wz-request cat-${color} ${reading?'reading':''}"><span class="wz-request-icon">${svg(IC.spark)}</span><div class="wz-request-text"><span class="wz-request-label">${esc(label)}${t.category_manual?' <small>(escolhido por você)</small>':''}</span><p>${esc(body)}</p>${note?`<small>${esc(note)}</small>`:''}${safety}</div></div>`;
  }
  function toolsHTML(t){
    const ai=aiState.get(t.id)||{},links=related?.(t.id)||'';
    return `<div class="wz-tools-body"><div class="wz-tool"><div class="row between wrap gap8"><strong>Resumo da conversa</strong>${action(ai.busy==='summary'?'Resumindo…':ai.summary?'Atualizar resumo':'Resumir com IA','ai-summary','secondary sm',ai.busy?'disabled':'')}</div><p>${esc(ai.summary||'A IA lê a conversa e resume o que a cliente pediu e o que falta responder.')}</p></div><div class="wz-tool"><div class="row between wrap gap8"><strong>Sugestão de resposta</strong>${action(ai.busy==='reply'?'Escrevendo…':'Sugerir resposta','ai-reply','secondary sm',ai.busy?'disabled':'')}</div><p class="small muted">A sugestão vai para o campo de resposta para você revisar. Nada é enviado sem você.</p></div>${ai.error?`<p class="small" role="alert" style="color:var(--red)">${esc(ai.error)}</p>`:''}<div class="wz-tool"><div class="row between wrap gap8"><strong>Orçamentos e tarefas</strong><span class="row wrap gap8">${onCreate?action('Criar orçamento','create-quote','secondary sm')+action('Criar tarefa','create-task','secondary sm'):''}</span></div>${links||'<p class="small muted">Nada ligado a esta conversa ainda.</p>'}</div></div>`;
  }
  /** Mantém o compositor e a reprodução de mídia; redesenha só o que mudou. */
  function paint() {
    if(!root?.isConnected)return;
    root.querySelector('#wa-session').hidden=!sessionExpired;root.querySelector('#wa-error').hidden=!error;root.querySelector('#wa-error').textContent=error;
    const configured=connection?.provider==='baileys'&&connection.status!=='disconnected'||connection?.provider==='meta'&&connection.credentialsVerified;
    setHTML(root.querySelector('#wa-status'),connection?`<span class="pill ${connection.connected?'green':'gray'}">${connection.connected?'WhatsApp conectado':configured?'Conectando…':'Desconectado'}</span><span>${connection.phone?esc(connection.phone):''}${connection.provider==='baileys'&&connection.status==='disconnected'?' Use Conectar por QR Code para ligar de novo.':''}</span>${connection.status!=='disconnected'?action('Desconectar','disconnect','text'):''}`:loading?'Consultando conexão…':'');
    setHTML(root.querySelector('#wa-setup-panel'),setupPanel());
    const configButton=root.querySelector('[data-action="wa-configure"]');configButton.textContent=connection?.provider==='baileys'&&connection.status!=='disconnected'?'Configuração avançada':'Conectar por QR Code';configButton.classList.toggle('primary',!connection?.connected);configButton.classList.toggle('secondary',!!connection?.connected);
    root.querySelectorAll('[data-action="wa-busy"]').forEach(b=>{const on=String(!!automation?.busy?.enabled)===b.dataset.value;b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on);b.disabled=!automation;});
    root.querySelector('#wa-pending').textContent=pending===null?'':`${pending} ${pending===1?'pendente':'pendentes'}`;
    root.querySelectorAll('[data-action="wa-filter"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===filter)));
    root.querySelector('[data-action="wa-group"]').setAttribute('aria-pressed',String(grouped));
    setHTML(root.querySelector('#wa-cats'),catsHTML());
    setHTML(root.querySelector('#wa-contacts'),listHTML());
    setHTML(root.querySelector('#wa-more-threads'),threadCursor?action('Carregar mais conversas','more-threads','text'):'');
    root.querySelector('.wz-inbox').classList.toggle('wz-mobile-thread',mobileThread);
    const t=threads.find(t=>t.id===selected);
    let panel=root.querySelector('#wa-thread');
    if(!t){
      panel.dataset.thread='';
      if(!panel.querySelector('.wz-empty'))panel.innerHTML='<div class="wz-empty"></div>';
      setHTML(panel.querySelector('.wz-empty'),connection?.connected?(threads.length?`<div class="wz-empty-art">${svg(IC.send)}</div><h3>Selecione uma conversa</h3><p>As pendentes ficam separadas por assunto, com a solicitação de cada cliente em destaque.</p>`:'<h3>Pronto para receber.</h3><p>Envie uma mensagem ao número conectado usando outro celular.</p>'):configured?'<h3>Conectando o WhatsApp…</h3><p>Siga as etapas acima. As conversas aparecem aqui assim que o número estiver conectado.</p>':`<h3>Seu atendimento, no mesmo lugar.</h3><p>Conecte o WhatsApp por QR Code para receber e responder pelo sistema.</p>${action('Configurar conexão','configure','primary')}`);
      return;
    }
    if(panel.dataset.thread!==selected){
      panel.dataset.thread=selected;
      panel.innerHTML=`<header class="wz-head"><button type="button" class="wz-icon-btn wz-back" data-action="wa-back" aria-label="Voltar para a lista de conversas" title="Voltar">${svg(IC.back,'stroke')}</button><span id="wa-head-avatar"></span><div class="wz-who"><h3 tabindex="-1"></h3><p class="small"></p></div><div class="wz-head-actions"><label class="wz-subject"><span class="sr-only">Assunto da conversa</span><select data-wa-change="category"></select></label><span id="wa-resolve"></span><details class="wz-menu"><summary class="wz-icon-btn" aria-label="Mais ações" title="Mais ações">${svg(IC.dots,'stroke')}</summary><div class="wz-menu-list"><label class="field wz-menu-subject"><span>Assunto</span><select data-wa-change="category"></select></label>${onCreate?action('Criar orçamento','create-quote','text')+action('Criar tarefa','create-task','text'):''}${action('Excluir conversa','erase-thread','text danger',`data-id="${esc(t.id)}"`)}</div></details></div></header><div id="wa-request"></div><details class="wz-tools" id="wa-tools"><summary>Ferramentas: resumo, sugestão de resposta, orçamentos e tarefas</summary><div id="wa-tools-body"></div></details><p id="wa-window" class="small wz-window"></p><div id="wa-log" class="wz-log" role="log" aria-label="Mensagens da conversa" aria-live="polite"><div id="wa-older"></div><div id="wa-messages"></div></div><button type="button" class="wz-scroll-down" data-action="wa-scroll-down" aria-label="Ir para a última mensagem" hidden>${svg(IC.down,'stroke')}</button><form novalidate data-form="wa-send" class="wz-composer"><div id="wa-quote-bar"></div><div id="wa-file-preview"></div><div id="wa-record" hidden></div><div class="wz-compose-row"><div class="wz-compose-box"><button type="button" class="wz-icon-btn" data-action="wa-emoji" aria-label="Emojis" aria-expanded="false" title="Emojis">${svg(IC.smile)}</button><label class="wz-compose-field"><span class="sr-only">Mensagem</span><textarea class="resize-none" name="text" maxlength="4096" rows="1" placeholder="Mensagem" aria-describedby="wa-compose-error"></textarea></label><details class="wz-attach"><summary class="wz-icon-btn" aria-label="Anexar" title="Anexar foto ou áudio">${svg(IC.clip,'stroke')}</summary><div class="wz-menu-list"><label class="btn text">${svg(IC.image,'stroke')}Foto<input name="image" type="file" accept="image/jpeg,image/png" class="wa-file"></label><label class="btn text">${svg(IC.wave,'stroke')}Arquivo de áudio<input name="audio" type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/aac,audio/x-aac,audio/amr,audio/ogg" class="wa-file"></label><small class="muted">Foto JPEG/PNG até 5 MB · áudio até 16 MB</small></div></details></div><button type="submit" class="wz-send" aria-label="Enviar mensagem" title="Enviar (Enter)">${svg(IC.send)}</button><button type="button" class="wz-send wz-mic" data-action="wa-record" aria-label="Gravar áudio" title="Gravar áudio">${svg(IC.mic)}</button></div><div id="wa-emoji-panel" class="wz-emoji" hidden></div><div id="wa-compose-error" role="alert" class="small"></div><span id="wa-send-state" class="small muted"></span></form>`;
      panel.querySelector('textarea').value=draft().text;resize(panel.querySelector('textarea'));
    }
    panel.querySelector('.wz-who h3').textContent=t.name;
    panel.querySelector('.wz-who p').textContent=[t.peer,t.savedName&&t.profileName&&t.profileName!==t.savedName?'No WhatsApp: '+t.profileName:''].filter(Boolean).join(' · ');
    setHTML(panel.querySelector('#wa-head-avatar'),avatar(t,'sm'));
    const options=`<option value="__auto">${t.category_manual?'Assunto pela IA':'Assunto: '+(subjectOf(t)||'aguardando')}</option>${categories().map(c=>`<option value="${esc(c.name)}" ${t.category_manual&&t.ai_category===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}`;
    for(const select of panel.querySelectorAll('[data-wa-change="category"]'))if(select.dataset.html!==options&&document.activeElement!==select){select.innerHTML=options;select.dataset.html=options;}
    setHTML(panel.querySelector('#wa-resolve'),action(t.resolved?'Reabrir':'Resolver','resolve',t.resolved?'secondary sm':'primary sm',`data-resolved="${!t.resolved}"`));
    setHTML(panel.querySelector('#wa-request'),requestHTML(t));
    setHTML(panel.querySelector('#wa-tools-body'),toolsHTML(t));
    const d=draft(),open=connection?.connected&&(connection.provider==='baileys'||t.last_inbound&&Date.now()-Date.parse(t.last_inbound)<86400000);
    panel.querySelector('#wa-window').textContent=!connection?.connected?'Reconecte o WhatsApp para responder pelo sistema.':connection.provider==='baileys'?'':open?'Pode responder até '+date(new Date(Date.parse(t.last_inbound)+86400000).toISOString())+'.':'Prazo encerrado. Aguarde uma nova mensagem ou responda no WhatsApp Business.';
    setHTML(panel.querySelector('#wa-older'),older?action('Carregar mensagens anteriores','older','text sm'):'');
    paintMessages(panel);
    const form=panel.querySelector('form'),locked=!!d.operation,area=form.querySelector('textarea'),hasContent=!!(d.text.trim()||d.file);
    area.disabled=locked||!open;form.querySelectorAll('input[type="file"]').forEach(x=>x.disabled=locked||!open);
    const sendButton=form.querySelector('[type="submit"]'),mic=form.querySelector('.wz-mic');
    sendButton.disabled=d.operation?.busy||(!open&&!locked);sendButton.setAttribute('aria-busy',String(!!d.operation?.busy));sendButton.title=d.operation?.busy?'Enviando…':locked?'Conferir tentativa':'Enviar (Enter)';
    const canRecord=open&&!locked&&!!recordType();
    sendButton.hidden=!(hasContent||locked||!canRecord);mic.hidden=!sendButton.hidden;mic.disabled=!canRecord;mic.classList.toggle('recording',!!recorder);
    panel.querySelector('#wa-send-state').innerHTML=locked?'Não reenvie por outro lugar antes de conferir esta tentativa. '+(!d.operation.busy?action('Já conferi no celular','release-attempt','text'):''):'';
    setHTML(panel.querySelector('#wa-quote-bar'),d.quote?`<div class="wz-quote-bar"><div class="wz-quote ${d.quote.direction==='out'?'mine':''}"><strong>${d.quote.direction==='out'?'Você':esc(t.name)}</strong><span>${esc(d.quote.body)}</span></div><button type="button" class="wz-icon-btn" data-action="wa-quote-cancel" aria-label="Cancelar resposta">${svg(IC.close,'stroke')}</button></div>`:'');
    setHTML(panel.querySelector('#wa-file-preview'),d.file?`<div class="wa-preview wz-file">${d.preview?`<img src="${esc(d.preview)}" width="90" height="70" alt="Prévia da imagem selecionada">`:svg(IC.wave,'stroke')}<div><strong>${esc(d.file.name)}</strong><small>${Math.ceil(d.file.size/1024)} KB · ${d.file.type.startsWith('audio')?'áudio sem legenda':'legenda opcional no campo de mensagem'}</small></div>${action('Remover arquivo','remove-file','text',locked?'disabled':'')}</div>`:'');
    // Abriu a conversa com mensagens não lidas: zera o contador (no sistema, não no celular).
    if(t.unread&&!document.hidden&&seenAsked!==t.id+':'+t.last_at){seenAsked=t.id+':'+t.last_at;t.unread=0;void post('thread/'+encodeURIComponent(t.id),{seen:true}).catch(()=>{});setHTML(root.querySelector('#wa-contacts'),listHTML());}
  }
  /** Bolhas: cria/atualiza só as que mudaram, com separadores de dia e agrupamento de mensagens seguidas. */
  function paintMessages(panel){
    const target=panel.querySelector('#wa-messages'),log=panel.querySelector('#wa-log'),bottom=log.scrollHeight-log.scrollTop-log.clientHeight<120;
    const t=threads.find(x=>x.id===selected);
    const list=[...messages.values()].filter(m=>m.threadId===selected).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
    const nodes=new Map([...target.querySelectorAll('.wz-msg')].map(n=>[n.dataset.id,n]));
    let added=false;
    for(const m of list){
      let node=nodes.get(m.id);const signature=JSON.stringify(m);
      if(!node){node=document.createElement('article');node.tabIndex=-1;node.dataset.id=m.id;target.append(node);added=true;}
      node.className='wz-msg '+(m.direction==='out'?'out':'in')+(m.auto?' auto':'');
      if(node.dataset.signature!==signature){
        node.dataset.signature=signature;
        const media=m.hasMedia?m.type==='image'?`<a class="wz-media" href="/api/whatsapp/media/${encodeURIComponent(m.id)}" target="_blank" rel="noopener"><img src="/api/whatsapp/media/${encodeURIComponent(m.id)}" alt="${m.direction==='out'?'Imagem enviada':'Imagem recebida da cliente'}" loading="lazy" width="260" height="180"></a>`:`<audio controls preload="none" src="/api/whatsapp/media/${encodeURIComponent(m.id)}" aria-label="${m.direction==='out'?'Áudio enviado':'Áudio da cliente'}"></audio>`:m.type==='image'||m.type==='audio'?`<p class="wz-note">${m.type==='image'?'📷 Imagem':'🎤 Áudio'} ${m.direction==='out'?'enviado':'indisponível; consulte no celular'}</p>`:'';
        const quote=m.quoteBody?`<div class="wz-quote ${messages.get(m.quoteId)?.direction==='out'?'mine':''}"><strong>${messages.get(m.quoteId)?.direction==='out'?'Você':esc(t?.name||'Cliente')}</strong><span>${esc(m.quoteBody)}</span></div>`:'';
        node.innerHTML=`<div class="wz-bubble"><span class="sr-only">${m.direction==='out'?'Você':'Cliente'}: </span>${m.auto?`<span class="wz-auto">${svg(IC.spark)}Automática · ${m.auto==='greeting'?'boas-vindas':'aviso de ocupada'}</span>`:''}${quote}${media}${m.body?`<p>${linkify(m.body)}</p>`:''}${m.error?`<p class="wz-error">${esc(m.error)}</p>`:''}<span class="wz-meta"><time datetime="${esc(m.at)}" title="${esc(date(m.at))}">${clock(m.at)}</time>${m.direction==='out'?tick(m.status):''}</span></div><div class="wz-msg-actions" role="group" aria-label="Ações da mensagem"><button type="button" class="wz-icon-btn" data-action="wa-reply" data-id="${esc(m.id)}" aria-label="Responder" title="Responder">${svg(IC.reply)}</button>${m.body?`<button type="button" class="wz-icon-btn" data-action="wa-copy-text" data-id="${esc(m.id)}" aria-label="Copiar texto" title="Copiar texto">${svg(IC.copy,'stroke')}</button>`:''}<button type="button" class="wz-icon-btn" data-action="wa-erase-message" data-id="${esc(m.id)}" aria-label="Excluir mensagem de ${date(m.at)}" title="Excluir do sistema">${svg(IC.trash,'stroke')}</button></div>`;
        node.querySelectorAll('img,audio').forEach(el=>el.addEventListener('error',()=>{if(node.querySelector('.wa-media-error'))return;const p=document.createElement('p');p.className='small wa-media-error';p.textContent='Arquivo expirado ou indisponível. Consulte no celular.';node.querySelector('.wz-bubble').append(p);},{once:true}));
      }
    }
    for(const [id,node] of nodes)if(!list.some(m=>m.id===id))node.remove();
    // Ordem, separadores de dia e mensagens seguidas do mesmo lado (sem recriar áudio/imagem).
    target.querySelectorAll('.wz-day').forEach(n=>n.remove());
    let last=null,prevDay='';
    for(const m of list){
      const node=target.querySelector(`.wz-msg[data-id="${CSS.escape(m.id)}"]`);target.append(node);
      const day=dayKey(m.at);
      if(day!==prevDay){const sep=document.createElement('div');sep.className='wz-day';sep.innerHTML=`<span>${dayLabel(day)}</span>`;target.insertBefore(sep,node);prevDay=day;last=null;}
      node.classList.toggle('cont',!!last&&last.direction===m.direction&&Date.parse(m.at)-Date.parse(last.at)<120000);
      last=m;
    }
    if(bottom||added&&list.at(-1)?.direction==='out')log.scrollTop=log.scrollHeight;
    panel.querySelector('.wz-scroll-down').hidden=log.scrollHeight-log.scrollTop-log.clientHeight<200;
  }
  /** Links clicáveis no texto (só http/https), o resto continua escapado. */
  function linkify(text){return esc(text).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)"']/g,url=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`).replace(/\n/g,'<br>');}
  function resize(area){if(!area)return;area.style.height='auto';area.style.height=Math.min(area.scrollHeight,160)+'px';}
  /** Respostas antigas são ignoradas após troca de conversa ou desmontagem. */
  async function refresh({moreThreads=false,moreMessages=false}={}) {
    if(!root?.isConnected||isExample()||loading)return;
    const own=++generation,thread=selected;controller?.abort();controller=new AbortController();loading=true;error='';
    try{
      const [c,list]=await Promise.all([api('connection',{signal:controller.signal}),api('threads'+(moreThreads&&threadCursor?'?before='+encodeURIComponent(threadCursor):''),{signal:controller.signal})]);
      if(!automation)automation=(await api('automation',{signal:controller.signal}).catch(()=>null))?.config||null;
      if(own!==generation)return;connection=c;pending=list.pending;onPending(pending);if(typeof list.rev==='number')rev=list.rev;
      const map=new Map((moreThreads?threads:threads.filter(t=>!list.threads.some(x=>x.id===t.id))).map(t=>[t.id,t]));for(const t of list.threads)map.set(t.id,t);threads=[...map.values()].sort((a,b)=>b.last_at.localeCompare(a.last_at));
      if(moreThreads||!threadCursor)threadCursor=list.older;
      if(thread){const data=await api('thread/'+encodeURIComponent(thread)+(moreMessages&&older?'?before='+encodeURIComponent(older):''),{signal:controller.signal});if(own!==generation||selected!==thread)return;for(const m of data.messages)messages.set(m.id,{...m,threadId:thread});if(moreMessages||!cursors.has(thread))cursors.set(thread,data.older);older=cursors.get(thread);}
    }catch(e){if(e.name!=='AbortError'&&own===generation)error=e.message;}finally{if(own===generation){loading=false;paint();}}
  }
  /** Espera novidades no servidor e atualiza na hora; volta a esperar logo em seguida. */
  async function watch(){
    if(watcher||isExample())return;
    const mine=watcher=new AbortController();
    while(watcher===mine&&root?.isConnected){
      if(document.hidden||rev===null){await new Promise(r=>setTimeout(r,1500));continue;}
      try{const r=await api('updates?rev='+rev,{signal:AbortSignal.any?AbortSignal.any([mine.signal,AbortSignal.timeout(40000)]):mine.signal});if(watcher!==mine)break;if(r.rev!==rev){rev=r.rev;await refresh();}}
      catch{if(mine.signal.aborted)break;await new Promise(r=>setTimeout(r,5000));}
    }
    if(watcher===mine)watcher=null;
  }
  /** Rascunho e tentativa ficam em memória até confirmação, nunca em localStorage. */
  async function sendMessage(form,file=null) {
    const d=draft(),thread=selected;
    if(d.operation?.busy)return;
    if(!d.operation){const text=file?'':d.text.trim(),attach=file||d.file;if(!text&&!attach){form.querySelector('[role="alert"]').textContent='Escreva uma mensagem ou escolha um arquivo.';form.querySelector('textarea').focus();return;}if(attach?.type?.startsWith('audio')&&d.text.trim()&&!file){form.querySelector('[role="alert"]').textContent='Áudio vai sem legenda: envie o texto separado.';return;}d.operation={id:crypto.randomUUID(),text,file:attach,quote:d.quote?.id||'',voice:!!file,busy:false};}
    const op=d.operation,body=new FormData();body.set('requestId',op.id);body.set('threadId',thread);body.set('text',op.text);if(op.quote)body.set('quoteId',op.quote);if(op.file)body.set('file',op.file,op.file.name);op.busy=true;form.querySelector('[role="alert"]').textContent='';paint();
    try{const data=await api('send',{method:'POST',body});messages.set(data.message.id,{...data.message,threadId:thread});
      if(['sending','uncertain'].includes(data.message.status)){op.busy=false;form.querySelector('[role="alert"]').textContent='Envio sem confirmação. Use Conferir tentativa para consultar a mesma operação.';}
      else if(data.message.status==='failed'){d.operation=null;toast('Mensagem não enviada. Confira o motivo na conversa antes de tentar de novo.');}
      else{const keepText=op.voice?d.text:'';if(d.preview&&!op.voice)URL.revokeObjectURL(d.preview);if(op.voice){d.operation=null;d.quote=null;}else drafts.delete(thread);if(selected===thread){const area=form.querySelector('textarea');area.value=keepText;resize(area);area.focus();}
        const t=threads.find(x=>x.id===thread);if(t){t.last_at=data.message.at;t.last_preview=op.file?(op.file.type.startsWith('audio')?'🎤 Áudio':'📷 '+(op.text||'Foto')):op.text;t.last_direction='out';t.last_status=data.message.status;t.unread=0;}
        if(data.message.status==='queued'&&!connection?.bridgeOnline)toast('Mensagem na fila. Ela sai quando o conector voltar a ficar online.');}
    }catch(e){op.busy=false;if(e.status&&e.status<500){d.operation=null;}form.querySelector('[role="alert"]').textContent=e.message;}finally{paint();}
  }
  /** IA da conversa: o resumo fica em Ferramentas; a sugestão vai para o campo de resposta para revisar. */
  async function runAI(task){
    const id=selected,t=threads.find(x=>x.id===id);if(!t||!aiRun)return;
    const state=aiState.get(id)||{};if(state.busy)return;
    aiState.set(id,{...state,busy:task,error:''});paint();
    const history=[...messages.values()].filter(m=>m.threadId===id).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)).map(m=>({who:m.direction==='in'?'cliente':'ateliê',text:m.body||(m.type==='image'?'[imagem]':m.type==='audio'?'[áudio]':'')}));
    try{
      const result=await aiRun(task,history,aiContext?.(t.peer,t.name)||{});
      const next={...aiState.get(id),busy:''};
      if(task==='summary')next.summary=result.summary;
      if(task==='reply'){const d=drafts.get(id)||{text:'',file:null,preview:null,operation:null,quote:null};d.text=result.reply;drafts.set(id,d);const area=root?.querySelector('[data-form="wa-send"] textarea');if(area&&selected===id){area.value=result.reply;resize(area);area.focus();}toast('Sugestão da IA no campo de resposta. Revise antes de enviar.');}
      aiState.set(id,next);
    }catch(e){aiState.set(id,{...aiState.get(id),busy:'',error:e.message});}
    paint();
  }
  /* ---------- Áudio gravado na hora (só formatos que o WhatsApp aceita, sem conversão) ---------- */
  function recordType(){const R=globalThis.MediaRecorder;if(!R?.isTypeSupported||!navigator.mediaDevices?.getUserMedia)return '';return ['audio/ogg;codecs=opus','audio/mp4;codecs=mp4a.40.2'].find(t=>R.isTypeSupported(t))||'';}
  async function startRecording(){
    const type=recordType();if(!type||recorder)return;
    let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});}catch{toast('Permita o uso do microfone no navegador para gravar áudio.');return;}
    recordChunks=[];recordCancel=false;recorder=new MediaRecorder(stream,{mimeType:type,audioBitsPerSecond:32000});
    recorder.ondataavailable=e=>{if(e.data?.size)recordChunks.push(e.data);};
    recorder.onstop=async()=>{stream.getTracks().forEach(x=>x.stop());clearInterval(recordTimer);const chunks=recordChunks,cancel=recordCancel;recorder=null;paintRecord();paint();if(cancel||!chunks.length)return;
      const mime=type.split(';')[0],file=new File(chunks,'audio-'+new Date().toISOString().slice(11,19).replaceAll(':','')+(mime==='audio/ogg'?'.ogg':'.m4a'),{type:mime});
      if(file.size>16*1024*1024){toast('Áudio grande demais (limite de 16 MB).');return;}
      const form=root?.querySelector('[data-form="wa-send"]');if(form)await sendMessage(form,file);};
    recorder.start();recordStart=Date.now();recordTimer=setInterval(paintRecord,500);paintRecord();paint();
  }
  function stopRecording(cancel){if(!recorder)return;recordCancel=cancel;recorder.stop();}
  function paintRecord(){const box=root?.querySelector('#wa-record');if(!box)return;box.hidden=!recorder;if(!recorder){box.innerHTML='';return;}const s=Math.floor((Date.now()-recordStart)/1000);const label=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;if(!box.firstChild){box.innerHTML=`<div class="wz-recording"><button type="button" class="wz-icon-btn" data-action="wa-record-cancel" aria-label="Descartar áudio" title="Descartar">${svg(IC.trash,'stroke')}</button><span class="wz-rec-dot" aria-hidden="true"></span><span class="wz-rec-time" role="timer" aria-live="off"></span><span class="grow small muted">Gravando…</span><button type="button" class="wz-send" data-action="wa-record-send" aria-label="Enviar áudio" title="Enviar áudio">${svg(IC.send)}</button></div>`;}box.querySelector('.wz-rec-time').textContent=label;}
  /* ---------- Emojis ---------- */
  const EMOJIS='😊 😀 😁 😂 🥰 😍 😘 😉 🙂 🤗 🤩 😅 😢 😭 😮 😴 🙏 👏 👍 👌 💪 🤝 ✌️ 🙌 💜 💖 ❤️ 💕 ✨ 🌸 🌷 🌺 💐 💇‍♀️ 💅 💄 ✂️ 🪮 🧴 📅 ⏰ 📍 💰 💳 📷 ✅ ❌ ⚠️ 🔥 🎉 ☀️ 🌙'.split(' ');
  function toggleEmoji(button){const panel=root?.querySelector('#wa-emoji-panel');if(!panel)return;const show=panel.hidden;panel.hidden=!show;button?.setAttribute('aria-expanded',String(show));if(show&&!panel.firstChild)panel.innerHTML=EMOJIS.map(e=>`<button type="button" data-action="wa-emoji-pick" data-value="${e}" aria-label="${e}">${e}</button>`).join('');}
  function insertText(value){const area=root?.querySelector('[data-form="wa-send"] textarea');if(!area||area.disabled)return;const start=area.selectionStart??area.value.length,end=area.selectionEnd??start;area.setRangeText(value,start,end,'end');draft().text=area.value;resize(area);area.focus();paint();}
  function setFile(file){
    const normalized={'audio/x-m4a':'audio/mp4','audio/m4a':'audio/mp4','audio/mp3':'audio/mpeg','audio/x-aac':'audio/aac'}[file.type];if(normalized)file=new File([file],file.name,{type:normalized});
    const d=draft(),image=['image/jpeg','image/png'].includes(file.type),audio=['audio/aac','audio/amr','audio/mpeg','audio/mp4','audio/ogg'].includes(file.type),err=root.querySelector('#wa-compose-error');
    if((!image&&!audio)||file.size>(image?5:16)*1024*1024||!file.size){err.textContent='Use foto JPEG/PNG até 5 MB ou áudio MP3, M4A, AAC, AMR, OGG Opus até 16 MB.';return;}
    if(d.preview)URL.revokeObjectURL(d.preview);d.file=file;d.preview=image?URL.createObjectURL(file):null;err.textContent='';paint();
  }
  async function click(event) {
    const button=event.target.closest('[data-action^="wa-"]');if(!button)return;
    const name=button.dataset.action.slice(3);
    if(name!=='emoji'&&name!=='emoji-pick'){const panel=root?.querySelector('#wa-emoji-panel');if(panel&&!panel.hidden&&!event.target.closest('#wa-emoji-panel')){panel.hidden=true;root.querySelector('[data-action="wa-emoji"]')?.setAttribute('aria-expanded','false');}}
    if(button.closest('details.wz-menu,details.wz-attach'))button.closest('details').open=false;
    if(name==='erase-thread'||name==='erase-message'){
      modal('Excluir '+(name==='erase-thread'?'conversa':'mensagem')+' do sistema?',`<div class="dialog-body"><p>A exclusão remove o conteúdo salvo neste sistema. Não apaga mensagens do celular da cliente nem do WhatsApp. Uma nova mensagem poderá criar a conversa novamente.</p></div>`,action('Manter','cancel-disconnect')+action('Confirmar exclusão','erase-confirm','danger',`data-kind="${name}" data-id="${esc(button.dataset.id||selected)}"`));return;
    }
    if(name==='erase-confirm'){
      button.disabled=true;try{await api(button.dataset.kind+'/'+encodeURIComponent(button.dataset.id),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});messages.clear();root?.querySelector('#wa-messages')?.replaceChildren();if(button.dataset.kind==='erase-thread'){threads=threads.filter(t=>t.id!==button.dataset.id);selected='';mobileThread=false;}closeModal(true);await refresh();toast('Conteúdo excluído do sistema.');}catch(e){error=e.message;closeModal(true);paint();}return;
    }
    if(name==='create-quote'||name==='create-task'){const t=threads.find(x=>x.id===selected);if(t&&onCreate)onCreate(name==='create-quote'?'quote':'task',{name:t.name,phone:t.peer,threadId:t.id,summary:aiState.get(selected)?.summary||t.ai_request||''});return;}
    if(name==='ai-summary'||name==='ai-reply'){await runAI(name==='ai-summary'?'summary':'reply');return;}
    if(name==='configure')configure();
    if(name==='automation')openAutomation?.();
    if(name==='busy'){const on=button.dataset.value==='true';if(!automation||automation.busy.enabled===on)return;const before=automation;automation={...automation,busy:{...automation.busy,enabled:on}};paint();try{automation=(await post('automation',{busy:{enabled:on}})).config;toast(on?'Aviso de ocupada ligado: quem disser o que precisa recebe a mensagem.':'Aviso de ocupada desligado.');}catch(e){automation=before;toast(e.message);}paint();return;}
    if(name==='reveal'){const input=button.closest('.wa-secret').querySelector('input');input.type=input.type==='password'?'text':'password';button.textContent=(input.type==='password'?'Mostrar ':'Ocultar ')+(button.dataset.label||'chave');button.setAttribute('aria-pressed',String(input.type==='text'));}
    if(name==='refresh'){automation=null;await refresh();}
    if(name==='copy'){const input=root.querySelector(button.dataset.copy==='url'?'#wa-callback-url':'#wa-verify-token');try{await navigator.clipboard.writeText(input.value);toast('Valor copiado.');}catch{input.focus();input.select();toast('Valor selecionado. Use Copiar no seu dispositivo.');}}
    if(name==='copy-text'){const m=messages.get(button.dataset.id);try{await navigator.clipboard.writeText(m?.body||'');toast('Texto copiado.');}catch{toast('Não foi possível copiar neste navegador.');}}
    if(name==='reply'){const m=messages.get(button.dataset.id);if(!m)return;draft().quote={id:m.id,direction:m.direction,body:m.body||(m.type==='image'?'📷 Foto':m.type==='audio'?'🎤 Áudio':'')};paint();root?.querySelector('[data-form="wa-send"] textarea')?.focus();}
    if(name==='quote-cancel'){draft().quote=null;paint();}
    if(name==='emoji')toggleEmoji(button);
    if(name==='emoji-pick')insertText(button.dataset.value);
    if(name==='record')await startRecording();
    if(name==='record-cancel')stopRecording(true);
    if(name==='record-send')stopRecording(false);
    if(name==='scroll-down'){const log=root?.querySelector('#wa-log');if(log)log.scrollTop=log.scrollHeight;button.hidden=true;}
    if(name==='pair-again'){button.disabled=true;try{connection=await api('connection/retry',{method:'POST'});paint();toast('Aguardando QR Code. O conector precisa estar ligado.');}catch(e){error=e.message;paint();}finally{button.disabled=false;}return;}
    if(name==='retry-connection'){button.disabled=true;try{connection=await api('connection/retry',{method:'POST'});paint();}catch(e){error=e.message;paint();}finally{button.disabled=false;}return;}
    if(name==='filter'){filter=button.dataset.value;paint();}
    if(name==='category'){category=button.dataset.value;paint();}
    if(name==='group'){grouped=!grouped;paint();}
    if(name==='select'){if(recorder)stopRecording(true);selected=button.dataset.id;older=cursors.get(selected)||null;mobileThread=true;loading=false;++generation;controller?.abort();paint();await refresh();root?.querySelector('.wz-who h3')?.focus();}
    if(name==='back'){mobileThread=false;paint();root?.querySelector(`.wz-item[data-id="${CSS.escape(selected)}"]`)?.focus();}
    if(name==='more-threads')await refresh({moreThreads:true});
    if(name==='older')await refresh({moreMessages:true});
    if(name==='remove-file'){const d=draft();if(d.preview)URL.revokeObjectURL(d.preview);d.file=null;d.preview=null;paint();}
    if(name==='release-attempt'){modal('Encerrar a conferência deste envio?',`<div class="dialog-body"><p>Confira a conversa no celular antes de continuar. Encerrar a conferência não cancela uma mensagem já enviada. A tentativa continuará no histórico com seu status.</p><p>O campo será liberado e o rascunho será limpo. Um novo envio será uma nova mensagem.</p></div>`,action('Continuar conferindo','cancel-disconnect')+action('Conferi e quero liberar','confirm-release','secondary'));document.querySelector('[data-action="wa-cancel-disconnect"]')?.focus();}
    if(name==='confirm-release'){const d=draft();if(d.preview)URL.revokeObjectURL(d.preview);drafts.delete(selected);const input=root?.querySelector('[data-form="wa-send"] textarea');if(input)input.value='';closeModal(true);paint();}
    if(name==='resolve'){button.disabled=true;try{await post('thread/'+encodeURIComponent(selected),{resolved:button.dataset.resolved==='true'});const t=threads.find(x=>x.id===selected);if(t)t.resolved=button.dataset.resolved==='true';toast(button.dataset.resolved==='true'?'Conversa resolvida.':'Conversa reaberta.');await refresh();}catch(e){error=e.message;paint();}finally{button.disabled=false;}}
    if(name==='disconnect'){modal('Desconectar o WhatsApp?',`<div class="dialog-body"><p>O sistema deixará de receber e enviar pelo número ${esc(connection?.phone)}. As conversas já recebidas continuam salvas. No Baileys, esta ação encerra a sessão do aparelho no conector.</p></div>`,action('Continuar conectado','cancel-disconnect')+action('Desconectar','confirm-disconnect','danger'));document.querySelector('[data-action="wa-cancel-disconnect"]')?.focus();}
    if(name==='cancel-disconnect')closeModal(true);
    if(name==='confirm-disconnect'){button.disabled=true;try{await api('connection',{method:'DELETE'});closeModal(true);toast('WhatsApp desconectado neste sistema.');await refresh();}catch(e){error=e.message;closeModal(true);paint();}}
  }
  /** Instala uma vez: cliques, digitação (Enter envia), colar/arrastar imagem e anexos. */
  function install() {
    window.addEventListener('beforeunload',event=>{if([...drafts.values()].some(d=>d.text||d.file||d.operation)||recorder){event.preventDefault();event.returnValue='';}});
    document.addEventListener('click',event=>{void click(event);});
    document.addEventListener('input',event=>{
      if(event.target.matches?.('[data-wa-input="search"]')){search=event.target.value;paint();return;}
      if(event.target.closest('[data-form="wa-send"]')&&event.target.name==='text'){draft().text=event.target.value;resize(event.target);const form=event.target.form;const d=draft(),locked=!!d.operation,canRecord=!!recordType();const send=form.querySelector('[type="submit"]'),mic=form.querySelector('.wz-mic');send.hidden=!(d.text.trim()||d.file||locked||!canRecord);mic.hidden=!send.hidden;}
    });
    // Enter envia (no computador). No celular, Enter quebra a linha e o botão envia, como no WhatsApp.
    document.addEventListener('keydown',event=>{
      const area=event.target;
      if(event.key==='Escape'&&root?.contains(area)){const panel=root.querySelector('#wa-emoji-panel');if(panel&&!panel.hidden){panel.hidden=true;return;}if(draft().quote){draft().quote=null;paint();return;}}
      if(area?.name!=='text'||!area.closest?.('[data-form="wa-send"]')||event.key!=='Enter'||event.shiftKey||event.isComposing||event.altKey||coarse())return;
      event.preventDefault();area.form.requestSubmit();
    });
    document.addEventListener('paste',event=>{const area=event.target.closest?.('[data-form="wa-send"]');if(!area)return;const file=[...(event.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(file){event.preventDefault();setFile(file);}});
    document.addEventListener('dragover',event=>{if(event.target.closest?.('.wz-thread')&&[...(event.dataTransfer?.types||[])].includes('Files')){event.preventDefault();event.target.closest('.wz-thread').classList.add('drop');}});
    document.addEventListener('dragleave',event=>{if(event.target.classList?.contains('wz-thread'))event.target.classList.remove('drop');});
    document.addEventListener('drop',event=>{const thread=event.target.closest?.('.wz-thread');if(!thread||!selected)return;event.preventDefault();thread.classList.remove('drop');const file=event.dataTransfer?.files?.[0];if(file&&!draft().operation)setFile(file);});
    document.addEventListener('scroll',event=>{if(event.target?.id==='wa-log'){const log=event.target,button=root?.querySelector('.wz-scroll-down');if(button)button.hidden=log.scrollHeight-log.scrollTop-log.clientHeight<200;}},true);
    document.addEventListener('change',async event=>{
      const input=event.target;
      if(input.matches?.('[data-wa-change="category"]')){const value=input.value==='__auto'?null:input.value;try{await post('thread/'+encodeURIComponent(selected),{category:value});const t=threads.find(x=>x.id===selected);if(t){t.category_manual=value?1:0;if(value){t.ai_category=value;t.ai_intent=1;}}toast(value?'Assunto alterado para '+value+'.':'O assunto volta a ser escolhido pela IA.');await refresh();}catch(e){toast(e.message);}return;}
      if(!input.closest?.('[data-form="wa-send"]')||input.type!=='file')return;const file=input.files[0];input.value='';input.closest('details')?.removeAttribute('open');if(file)setFile(file);
    });
    document.addEventListener('submit',async event=>{const form=event.target,kind=form.dataset.form;if(!kind?.startsWith('wa-'))return;event.preventDefault();if(kind==='wa-send'){await sendMessage(form);return;}if(kind!=='wa-connect'||form.dataset.busy||!validate(form))return;
      form.dataset.busy='true';form.querySelector('[type="submit"]').disabled=true;
      try{const fd=new FormData(form);connection=await api('connection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'baileys',bridgeKey:String(fd.get('bridgeKey')||'').trim()})});form.elements.bridgeKey.value='';form.dataset.dirty='';delete form.dataset.busy;closeModal(true);toast('Chave cadastrada. O QR Code aparece aqui assim que o conector responder.');await refresh();}
      catch(e){const alert=form.querySelector('[role="alert"]');alert.textContent=e.message;form.elements.bridgeKey.setAttribute('aria-invalid','true');form.elements.bridgeKey.focus();}
      finally{delete form.dataset.busy;form.querySelector('[type="submit"]').disabled=false;paint();}
    });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&root?.isConnected)void refresh();});
  }
  function unmount(){controller?.abort();watcher?.abort();watcher=null;if(recorder)stopRecording(true);++generation;loading=false;root=null;}
  async function count(){if(isExample()||document.hidden||root?.isConnected)return;try{const data=await api('threads');pending=data.pending;onPending(pending);}catch{/* o contador não substitui falhas da caixa */}}
  function mount(){
    const next=document.getElementById('whatsapp-root');
    // Fora da caixa: só o contador do menu (30 s). Dentro: espera novidades (/updates) e confere a conexão a cada 30 s.
    if(!timer&&!isExample()&&document.getElementById('main')?.isConnected){void count();timer=setInterval(()=>{if(document.hidden)return;if(root?.isConnected)void refresh();else void count();},30000);}
    if(next===root)return;unmount();if(!next||isExample())return;root=next;root.innerHTML=shell();paint();void refresh().then(()=>watch());
  }
  /** Uma confirmação por navegação; rascunhos permanecem ao trocar de conversa. */
  function guard(proceed){const d=drafts.get(selected);if(root?.isConnected&&(d?.text||d?.file||d?.operation)){confirmLeaving(proceed);return true;}return false;}
  /** Abre uma conversa específica (por exemplo, a origem de um orçamento) na próxima montagem da caixa. */
  function open(id){selected=String(id||'');older=cursors.get(selected)||null;mobileThread=!!selected;if(root?.isConnected){paint();void refresh();}}
  /** Contatos das conversas já carregadas, para sugerir em orçamentos e tarefas. */
  function contacts(){return threads.map(t=>({name:t.name,phone:t.peer,threadId:t.id}));}
  /** Configuração mudou no painel Automação: relê na próxima atualização. */
  function automationChanged(config){automation=config||null;if(root?.isConnected)paint();}
  return {install,mount,unmount,configure,guard,open,contacts,automationChanged};
}

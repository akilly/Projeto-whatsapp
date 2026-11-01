/** Painel Automação: mensagens automáticas em forma de regras ("quando… envie… depois de…") e os assuntos
 * (com cor e prioridade) que a IA usa para separar as conversas do WhatsApp.
 * Ligar/desligar uma regra salva na hora (como o tema claro/escuro). Editar abre o formulário dentro do próprio
 * cartão; "Nova automação" oferece modelos prontos ou uma regra em branco. A configuração fica no servidor
 * (wa_automation), por salão, porque as mensagens automáticas saem mesmo com o site fechado.
 */
const COLORS = [['purple', 'Roxo'], ['blue', 'Azul'], ['green', 'Verde'], ['orange', 'Laranja'], ['red', 'Vermelho'], ['pink', 'Rosa'], ['teal', 'Turquesa'], ['gray', 'Cinza']];
const PRIORITIES = [['alta', 'Alta'], ['normal', 'Normal'], ['baixa', 'Baixa'], ['auto', 'A IA decide']];
const DELAYS = [[0, 'Na hora'], [15, '15 segundos'], [30, '30 segundos'], [60, '1 minuto'], [120, '2 minutos'], [180, '3 minutos'], [300, '5 minutos'], [600, '10 minutos'], [1800, '30 minutos']];
const DAYS = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];
const TRIGGERS = {
  greeting: { label: 'A cliente só cumprimenta', hint: 'Mandou só "oi", "bom dia" ou "tudo bem?" e ainda não disse o que precisa.', icon: '👋' },
  request: { label: 'A cliente diz o que precisa', hint: 'A IA entendeu o pedido (ex.: aviso de que você está ocupada).', icon: '💬' },
  category: { label: 'A conversa é de um assunto', hint: 'Quando a IA (ou você) coloca a conversa neste assunto.', icon: '🏷️' },
  keywords: { label: 'A mensagem tem certas palavras', hint: 'Responde na hora a perguntas comuns, como endereço ou formas de pagamento.', icon: '🔎' },
  away: { label: 'Chega fora do horário', hint: 'Mensagens recebidas fora dos dias e horários de atendimento.', icon: '🌙' },
  first: { label: 'Contato novo', hint: 'A primeira mensagem de alguém que nunca escreveu antes.', icon: '✨' },
};
const BUILT_IN = ['greeting', 'busy'];

export function createAutomationPage({ esc, btn, heading, toast, isExample, onSaved, rerender, confirm }) {
  let config = null, templates = [], cats = null, editing = null, choosing = false, loading = false, saving = false, error = '', editError = '';
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const catsDirty = () => !!config && !!cats && !same(cats, config.categories);
  const ruleDirty = () => !!editing && !same(editing.rule, editing.original);
  async function request(method = 'GET', body) {
    const response = await fetch('/api/whatsapp/automation', { method, cache: 'no-store', headers: { 'X-Atelier-Dataset': 'real', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || 'Não foi possível salvar a automação. Tente de novo.');
    if (data.templates) templates = data.templates;
    return data.config;
  }
  async function load() {
    if (loading || isExample()) return;
    loading = true; error = '';
    try { config = await request(); cats = clone(config.categories); onSaved?.(config); }
    catch (e) { error = e.message; }
    finally { loading = false; rerender(); }
  }
  const delayLabel = s => DELAYS.find(([v]) => v === s)?.[1] || (s >= 60 ? Math.round(s / 60) + ' minutos' : s + ' segundos');
  const sample = text => String(text).replace(/\{nome\}/g, 'Maria');
  const focusLater = selector => setTimeout(() => document.querySelector(selector)?.focus(), 0);
  function when(r) {
    if (r.trigger === 'category') return 'Assunto: ' + r.category;
    if (r.trigger === 'keywords') return 'Palavras: ' + (r.keywords || []).join(', ');
    if (r.trigger === 'away') return 'Fora de ' + DAYS.filter(([d]) => r.hours?.days?.includes(d)).map(([, l]) => l).join(', ') + ', ' + r.hours?.start + '–' + r.hours?.end;
    return TRIGGERS[r.trigger]?.label || '';
  }
  const switchBtn = (on, attrs, label) => `<button type="button" class="auto-switch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" ${attrs} ${saving ? 'disabled' : ''}><span class="auto-switch-track"><span class="auto-switch-thumb"></span></span><span class="auto-switch-text">${on ? 'Ligada' : 'Desligada'}</span></button>`;
  const bubble = text => `<div class="automation-preview" aria-label="Prévia da mensagem"><span class="automation-preview-label">Prévia</span><div class="wz-msg out auto"><div class="wz-bubble"><span class="wz-auto">Automática</span><p>${esc(sample(text))}</p><span class="wz-meta"><time>10:32</time></span></div></div></div>`;

  /* ---------- Regras ---------- */
  function editor(r) {
    const cat = r.trigger === 'category' ? `<label class="field"><span>Qual assunto</span><select data-auto-rule="category">${(cats || config.categories).map(c => `<option ${c.name === r.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : '';
    const words = r.trigger === 'keywords' ? `<label class="field full"><span>Palavras (separe por vírgula)</span><input data-auto-rule="keywords" value="${esc((r.keywords || []).join(', '))}" maxlength="400" placeholder="endereço, onde fica, localização"><small class="muted">Sem diferença entre maiúsculas e acentos. Envia na hora em que a palavra aparecer.</small></label>` : '';
    const hours = r.trigger === 'away' ? `<fieldset class="field full auto-hours"><legend>Horário de atendimento</legend><div class="auto-days" role="group" aria-label="Dias de atendimento">${DAYS.map(([d, l]) => `<label class="auto-day"><input type="checkbox" data-auto-rule="day" value="${d}" ${r.hours?.days?.includes(d) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div><div class="row gap8 wrap"><label class="field"><span>Das</span><input type="time" data-auto-rule="start" value="${esc(r.hours?.start || '09:00')}"></label><label class="field"><span>Até</span><input type="time" data-auto-rule="end" value="${esc(r.hours?.end || '18:00')}"></label></div></fieldset>` : '';
    const delays = DELAYS.filter(([v]) => r.trigger !== 'greeting' || v >= 15);
    const fixed = BUILT_IN.includes(r.id);
    return `<form novalidate data-form="auto-rule" class="auto-editor">
      <div class="automation-grid">
        <label class="field"><span>Nome da automação</span><input data-auto-rule="name" value="${esc(r.name)}" maxlength="60" required placeholder="Ex.: Endereço do ateliê"></label>
        <label class="field"><span>Quando</span><select data-auto-rule="trigger" ${fixed ? 'disabled' : ''}>${Object.entries(TRIGGERS).map(([k, t]) => `<option value="${k}" ${k === r.trigger ? 'selected' : ''}>${t.label}</option>`).join('')}</select><small class="muted">${esc(TRIGGERS[r.trigger]?.hint || '')}</small></label>
        ${cat}${words}${hours}
        <label class="field"><span>Esperar antes de enviar</span><select data-auto-rule="delay">${delays.map(([v, l]) => `<option value="${v}" ${Number(r.delay) === v ? 'selected' : ''}>${l}</option>`).join('')}</select><small class="muted">Conta a partir da última mensagem da cliente.</small></label>
        <label class="field full"><span>Mensagem</span><textarea class="resize-none" rows="3" maxlength="1000" data-auto-rule="text" required>${esc(r.text)}</textarea><span class="row gap8 wrap auto-insert"><button type="button" class="chip-btn" data-action="auto-insert" data-value="{nome}">+ Nome da cliente</button><small class="muted">{nome} vira o primeiro nome (some quando não houver).</small></span></label>
        ${bubble(r.text)}
      </div>
      <p class="small auto-error" role="alert">${esc(editError)}</p>
      <div class="auto-editor-actions">${editing.id && !fixed ? btn('Excluir', 'auto-rule-delete', '', 'text danger sm') : ''}<span class="grow"></span>${btn('Cancelar', 'auto-rule-cancel', '', 'secondary sm')}<button type="submit" class="btn primary sm" ${saving ? 'disabled' : ''}>${saving ? 'Salvando…' : editing.id ? 'Salvar automação' : 'Criar automação'}</button></div>
    </form>`;
  }
  function ruleCard(r) {
    const open = editing?.id === r.id;
    return `<article class="auto-rule ${r.enabled ? '' : 'off'} ${open ? 'editing' : ''}" data-rule="${esc(r.id)}"><div class="auto-rule-head"><span class="auto-rule-icon" aria-hidden="true">${TRIGGERS[r.trigger]?.icon || '•'}</span><div class="auto-rule-text"><h3>${esc(r.name)}</h3><p class="small muted">${esc(when(r))} · ${esc(r.delay ? 'espera ' + delayLabel(r.delay) : 'envia na hora')}</p>${open ? '' : `<p class="auto-rule-msg">${esc(r.text)}</p>`}</div><div class="auto-rule-actions">${switchBtn(r.enabled, `data-action="auto-rule-toggle" data-id="${esc(r.id)}"`, (r.enabled ? 'Desligar ' : 'Ligar ') + r.name)}${open ? '' : btn('Editar', 'auto-rule-edit', '', 'secondary sm', `data-id="${esc(r.id)}"`)}</div></div>${open ? editor(editing.rule) : ''}</article>`;
  }
  function chooser() {
    const cards = templates.map((t, i) => `<button type="button" class="auto-template" data-action="auto-template" data-index="${i}"><span class="auto-rule-icon" aria-hidden="true">${TRIGGERS[t.trigger]?.icon || '•'}</span><span><strong>${esc(t.name)}</strong><small>${esc(TRIGGERS[t.trigger]?.label || '')}</small></span></button>`).join('');
    return `<div class="auto-chooser" role="group" aria-label="Escolha um modelo"><div class="row between wrap gap8"><strong>Comece por um modelo</strong>${btn('Fechar', 'auto-choose-close', '', 'text sm')}</div><div class="auto-templates">${cards}<button type="button" class="auto-template blank" data-action="auto-template" data-index="-1"><span class="auto-rule-icon" aria-hidden="true">＋</span><span><strong>Em branco</strong><small>Escolha você o gatilho e a mensagem</small></span></button></div></div>`;
  }
  /* ---------- Assuntos ---------- */
  function categoryRow(c, i, total) {
    return `<li class="automation-category"><span class="wz-dot cat-${esc(c.color)}" aria-hidden="true"></span><label class="field"><span class="sr-only">Nome do assunto ${i + 1}</span><input value="${esc(c.name)}" maxlength="40" required data-auto-cat="name" data-index="${i}" placeholder="Nome do assunto"></label><label class="field auto-prio prio-${esc(c.priority)}"><span class="sr-only">Prioridade</span><select data-auto-cat="priority" data-index="${i}">${PRIORITIES.map(([v, l]) => `<option value="${v}" ${c.priority === v ? 'selected' : ''}>${v === 'auto' ? l : 'Prioridade ' + l.toLowerCase()}</option>`).join('')}</select></label><label class="field automation-color"><span class="sr-only">Cor</span><select data-auto-cat="color" data-index="${i}">${COLORS.map(([v, label]) => `<option value="${v}" ${c.color === v ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="field automation-desc"><span class="sr-only">Quando usar</span><input value="${esc(c.description)}" maxlength="200" data-auto-cat="description" data-index="${i}" placeholder="Quando usar (ajuda a IA a decidir)"></label><span class="automation-row-actions"><button type="button" class="icon-btn" data-action="auto-move" data-index="${i}" data-dir="-1" aria-label="Subir ${esc(c.name)}" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="icon-btn" data-action="auto-move" data-index="${i}" data-dir="1" aria-label="Descer ${esc(c.name)}" ${i === total - 1 ? 'disabled' : ''}>↓</button><button type="button" class="icon-btn" data-action="auto-remove" data-index="${i}" aria-label="Remover ${esc(c.name)}" ${total <= 1 ? 'disabled' : ''}>✕</button></span></li>`;
  }
  function page() {
    const head = heading('Automação', 'Mensagens automáticas e assuntos das conversas do WhatsApp.');
    if (isExample()) return head + '<div class="notice">A automação usa o WhatsApp real.</div>';
    if (!config) { if (!loading && !error) void load(); return head + (error ? `<div class="notice red" role="alert">${esc(error)} ${btn('Tentar de novo', 'auto-reload', '', 'secondary sm')}</div>` : '<p class="muted">Carregando a automação…</p>'); }
    const newRule = editing && !editing.id ? `<article class="auto-rule editing new" data-rule=""><div class="auto-rule-head"><span class="auto-rule-icon" aria-hidden="true">${TRIGGERS[editing.rule.trigger]?.icon || '•'}</span><div class="auto-rule-text"><h3>Nova automação</h3><p class="small muted">Confira o gatilho e a mensagem. Ela já começa ligada.</p></div></div>${editor(editing.rule)}</article>` : '';
    const dirty = catsDirty();
    return head + `<div class="automation">
      <section class="card automation-card"><div class="automation-head"><div><span class="eyebrow">Respostas que saem sozinhas</span><h2>Mensagens automáticas</h2><p class="muted">Cada automação sai no máximo uma vez por atendimento e só se você ainda não respondeu. Ligue e desligue quando quiser.</p></div>${editing || choosing ? '' : btn('Nova automação', 'auto-new', 'plus', 'primary')}</div>
        ${choosing ? chooser() : ''}${newRule}
        <div class="auto-rules">${config.rules.map(ruleCard).join('') || '<p class="muted">Nenhuma automação ainda.</p>'}</div></section>
      <form novalidate data-form="auto-cats" class="card automation-card"><div class="automation-head"><div><span class="eyebrow">Separar e priorizar</span><h2>Assuntos das conversas</h2><p class="muted">A IA lê cada mensagem nova, escolhe o assunto e resume o pedido. A lista de conversas segue esta ordem. Com "A IA decide", a prioridade vem do que a cliente escreveu.</p></div>${switchBtn(config.classify.enabled, 'data-action="auto-classify"', config.classify.enabled ? 'Desligar a IA' : 'Ligar a IA').replace(/Ligada|Desligada/, config.classify.enabled ? 'IA ligada' : 'IA desligada')}</div>
        <ol class="automation-categories">${cats.map((c, i) => categoryRow(c, i, cats.length)).join('')}</ol>
        <div class="row wrap gap8">${cats.length < 20 ? btn('Adicionar assunto', 'auto-add', 'plus', 'secondary sm') : ''}${btn('Restaurar a lista padrão', 'auto-defaults', 'undo', 'text sm')}</div>
        <div class="automation-actions ${dirty ? 'dirty' : ''}"><p id="automation-error" class="small" role="alert">${esc(error)}</p><span class="small muted">${dirty ? 'Há alterações nos assuntos.' : 'Assuntos salvos.'}</span>${btn('Descartar', 'auto-discard', '', 'secondary', dirty && !saving ? '' : 'disabled')}<button type="submit" class="btn primary" ${dirty && !saving ? '' : 'disabled'}>${saving ? 'Salvando…' : 'Salvar assuntos'}</button></div>
      </form>
    </div>`;
  }
  /* ---------- Ações ---------- */
  async function save(patch, message, after) {
    if (saving) return false;
    saving = true; error = ''; editError = ''; rerender();
    try { config = await request('POST', patch); if (!catsDirty() || patch.categories) cats = clone(config.categories); after?.(); onSaved?.(config); toast(message); return true; }
    catch (e) { if (editing) editError = e.message; else error = e.message; return false; }
    finally { saving = false; rerender(); }
  }
  /** Pergunta antes de perder o que foi digitado. */
  function guarded(dirty, message, proceed) { if (dirty && confirm) confirm(message, proceed); else proceed(); }
  function startEdit(rule, id) { editing = { id, rule: clone(rule), original: clone(rule) }; choosing = false; editError = ''; rerender(); focusLater('[data-auto-rule="name"]'); }
  function readRule(input) {
    const r = editing.rule, k = input.dataset.autoRule;
    if (k === 'name' || k === 'text') r[k] = input.value;
    if (k === 'delay') r.delay = Number(input.value);
    if (k === 'category') r.category = input.value;
    if (k === 'keywords') r.keywords = input.value.split(',').map(w => w.trim()).filter(Boolean);
    if (k === 'start' || k === 'end') r.hours = { ...r.hours, [k]: input.value };
    if (k === 'day') { const days = new Set(r.hours?.days || []); input.checked ? days.add(Number(input.value)) : days.delete(Number(input.value)); r.hours = { ...r.hours, days: [...days].sort() }; }
    if (k === 'trigger') {
      r.trigger = input.value;
      if (r.trigger === 'category' && !r.category) r.category = (cats || config.categories)[0]?.name;
      if (r.trigger === 'keywords' && !r.keywords) r.keywords = [];
      if (r.trigger === 'away' && !r.hours) r.hours = { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '18:00' };
      if (r.trigger === 'greeting' && r.delay < 15) r.delay = 120;
      rerender(); focusLater('[data-auto-rule="trigger"]');
    }
  }
  function submitRule() {
    const r = editing.rule;
    r.name = r.name.trim(); r.text = r.text.trim();
    editError = !r.name ? 'Dê um nome à automação.' : !r.text ? 'Escreva a mensagem que será enviada.' : r.trigger === 'keywords' && !r.keywords?.length ? 'Escreva pelo menos uma palavra.' : r.trigger === 'away' && !r.hours?.days?.length ? 'Marque pelo menos um dia de atendimento.' : r.trigger === 'away' && r.hours.start >= r.hours.end ? 'O horário final precisa ser depois do inicial.' : '';
    if (editError) { rerender(); return; }
    const isNew = !editing.id, rule = isNew ? { ...r, id: 'r' + Date.now().toString(36), enabled: true } : r;
    const rules = isNew ? [...config.rules, rule] : config.rules.map(x => x.id === editing.id ? rule : x);
    void save({ rules }, isNew ? 'Automação criada e ligada.' : 'Automação salva.', () => { editing = null; });
  }
  function install() {
    document.addEventListener('input', e => {
      const input = e.target.closest?.('[data-auto-rule],[data-auto-cat]'); if (!input || !config) return;
      if (input.dataset.autoRule && editing) {
        if (['trigger', 'day'].includes(input.dataset.autoRule)) return;
        readRule(input);
        if (input.dataset.autoRule === 'text') { const p = input.closest('form').querySelector('.automation-preview p'); if (p) p.textContent = sample(input.value); }
        return;
      }
      const i = Number(input.dataset.index), k = input.dataset.autoCat;
      if (cats?.[i]) cats[i][k] = input.value;
      const form = input.closest('form'), dirty = catsDirty();
      form.querySelector('[type=submit]').disabled = !dirty || saving; form.querySelector('[data-action="auto-discard"]').disabled = !dirty || saving;
      form.querySelector('.automation-actions .muted').textContent = dirty ? 'Há alterações nos assuntos.' : 'Assuntos salvos.'; form.querySelector('.automation-actions').classList.toggle('dirty', dirty);
    });
    document.addEventListener('change', e => {
      const input = e.target.closest?.('[data-auto-rule],[data-auto-cat]'); if (!input || !config) return;
      if (input.dataset.autoRule && editing) { if (['trigger', 'day'].includes(input.dataset.autoRule)) readRule(input); return; }
      if (['color', 'priority'].includes(input.dataset.autoCat)) { cats[Number(input.dataset.index)][input.dataset.autoCat] = input.value; rerender(); }
    });
    document.addEventListener('click', e => {
      const b = e.target.closest?.('[data-action^="auto-"]'); if (!b) return;
      const a = b.dataset.action, i = Number(b.dataset.index);
      if (a === 'auto-reload') { error = ''; void load(); }
      if (!config) return;
      if (a === 'auto-rule-toggle') { const r = config.rules.find(x => x.id === b.dataset.id); if (r) void save({ toggle: { id: r.id, enabled: !r.enabled } }, (r.enabled ? 'Desligada: ' : 'Ligada: ') + r.name + '.', () => { if (editing?.id === r.id) { editing.rule.enabled = !r.enabled; editing.original.enabled = !r.enabled; } }); }
      if (a === 'auto-classify') void save({ classify: { enabled: !config.classify.enabled } }, config.classify.enabled ? 'IA desligada: as conversas ficam sem assunto automático.' : 'Separação por assunto com IA ligada.');
      if (a === 'auto-rule-edit') { const r = config.rules.find(x => x.id === b.dataset.id); if (r) guarded(ruleDirty(), 'Há alterações em outra automação. Deseja descartá-las?', () => startEdit(r, r.id)); }
      if (a === 'auto-new') guarded(ruleDirty(), 'Há alterações em uma automação. Deseja descartá-las?', () => { editing = null; choosing = true; rerender(); focusLater('.auto-template'); });
      if (a === 'auto-choose-close') { choosing = false; rerender(); }
      if (a === 'auto-template') { const t = i >= 0 ? templates[i] : { name: '', trigger: 'keywords', keywords: [], delay: 0, text: '' }; startEdit({ enabled: true, ...clone(t), ...(t.trigger === 'category' && !(cats || config.categories).some(c => c.name === t.category) ? { category: (cats || config.categories)[0]?.name } : {}) }, null); }
      if (a === 'auto-rule-cancel') guarded(ruleDirty(), 'Descartar as alterações desta automação?', () => { editing = null; editError = ''; rerender(); });
      if (a === 'auto-rule-delete' && editing?.id) { const id = editing.id, name = editing.original.name; confirm ? confirm(`Excluir a automação "${name}"? Ela deixa de ser enviada.`, () => void save({ rules: config.rules.filter(x => x.id !== id) }, 'Automação excluída.', () => { editing = null; })) : void save({ rules: config.rules.filter(x => x.id !== id) }, 'Automação excluída.', () => { editing = null; }); }
      if (a === 'auto-insert') { const area = b.closest('form')?.querySelector('[data-auto-rule="text"]'); if (area) { const s = area.selectionStart ?? area.value.length; area.setRangeText(b.dataset.value, s, area.selectionEnd ?? s, 'end'); area.dispatchEvent(new Event('input', { bubbles: true })); area.focus(); } }
      if (a === 'auto-add') { cats.push({ name: '', color: 'purple', priority: 'auto', description: '' }); rerender(); focusLater(`[data-auto-cat="name"][data-index="${cats.length - 1}"]`); }
      if (a === 'auto-remove' && cats.length > 1) { cats.splice(i, 1); rerender(); }
      if (a === 'auto-move') { const j = i + Number(b.dataset.dir); if (j < 0 || j >= cats.length) return; [cats[i], cats[j]] = [cats[j], cats[i]]; rerender(); focusLater(`[data-action="auto-move"][data-index="${j}"][data-dir="${b.dataset.dir}"]`); }
      if (a === 'auto-defaults') guarded(true, 'Voltar à lista padrão de assuntos? Os assuntos que você criou ou mudou serão substituídos.', () => void save({ categories: [] }, 'Lista padrão de assuntos restaurada.'));
      if (a === 'auto-discard') { cats = clone(config.categories); error = ''; rerender(); }
    });
    document.addEventListener('submit', e => {
      const form = e.target, kind = form.dataset?.form;
      if (kind === 'auto-rule' && editing) { e.preventDefault(); submitRule(); return; }
      if (kind !== 'auto-cats' || !cats) return;
      e.preventDefault();
      const names = cats.map(c => c.name.trim());
      if (names.some(n => !n)) { error = 'Dê um nome a cada assunto ou remova a linha vazia.'; rerender(); return; }
      if (new Set(names.map(n => n.toLowerCase())).size !== names.length) { error = 'Há dois assuntos com o mesmo nome.'; rerender(); return; }
      void save({ categories: cats.map(c => ({ ...c, name: c.name.trim() })) }, 'Assuntos salvos.');
    });
  }
  /** Ao abrir de novo: recarrega do servidor se não houver nada sendo editado. */
  function opened() { if (!ruleDirty() && !catsDirty()) { config = null; cats = null; editing = null; choosing = false; } }
  /** Sair da página sem salvar: descarta o que estava aberto (a confirmação é feita por quem navega). */
  function discard() { editing = null; choosing = false; if (config) cats = clone(config.categories); }
  return { page, install, opened, discard, dirty: () => ruleDirty() || catsDirty() };
}

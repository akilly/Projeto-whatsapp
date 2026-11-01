/** Painel Automação: boas-vindas automática, aviso de "estou ocupada" e assuntos (categorias) que a IA usa
 * para separar as conversas do WhatsApp. Os seletores salvam na hora (como o tema claro/escuro); textos,
 * tempos e categorias são salvos pelo botão. A configuração fica no servidor (wa_automation), por salão,
 * porque as mensagens automáticas saem mesmo com o site fechado.
 */
const COLORS = [['purple', 'Roxo'], ['blue', 'Azul'], ['green', 'Verde'], ['orange', 'Laranja'], ['red', 'Vermelho'], ['pink', 'Rosa'], ['teal', 'Turquesa'], ['gray', 'Cinza']];
const GREETING_DELAYS = [[30, '30 segundos'], [60, '1 minuto'], [120, '2 minutos'], [180, '3 minutos'], [300, '5 minutos'], [600, '10 minutos']];
const BUSY_DELAYS = [[0, 'Na hora'], [15, '15 segundos'], [30, '30 segundos'], [60, '1 minuto'], [120, '2 minutos'], [300, '5 minutos']];

export function createAutomationPage({ esc, btn, heading, toast, isExample, onSaved, rerender }) {
  let config = null, draft = null, loading = false, saving = false, error = '';
  const clone = value => JSON.parse(JSON.stringify(value));
  async function request(method = 'GET', body) {
    const response = await fetch('/api/whatsapp/automation', { method, cache: 'no-store', headers: { 'X-Atelier-Dataset': 'real', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || 'Não foi possível salvar a automação. Tente de novo.');
    return data.config;
  }
  async function load() {
    if (loading || isExample()) return;
    loading = true; error = '';
    try { config = await request(); draft = clone(config); onSaved?.(config); }
    catch (e) { error = e.message; }
    finally { loading = false; rerender(); }
  }
  /** Seletor no estilo do tema claro/escuro. */
  const toggle = (name, on, labels = ['Desligada', 'Ligada']) => `<div class="theme-control automation-switch" role="group" aria-label="${esc(labels.join(' ou '))}">${[false, true].map(value => `<button type="button" data-action="auto-toggle" data-name="${name}" data-value="${value}" aria-pressed="${on === value}" class="${on === value ? 'active' : ''}" ${saving ? 'disabled' : ''}>${labels[Number(value)]}</button>`).join('')}</div>`;
  const select = (name, options, value) => `<select name="${name}" data-auto-input="${name}">${options.map(([v, label]) => `<option value="${v}" ${Number(value) === v ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
  const bubble = text => `<div class="automation-preview" aria-label="Prévia da mensagem"><div class="wz-msg out auto"><div class="wz-bubble"><span class="wz-auto">Automática</span><p>${esc(text)}</p><span class="wz-meta"><time>10:32</time></span></div></div></div>`;
  const sample = text => String(text).replace(/[ \t]*,?[ \t]*\{nome\}/g, m => m.replace('{nome}', 'Maria'));
  function categoryRow(c, i, total) {
    return `<li class="automation-category"><span class="wz-dot cat-${esc(c.color)}" aria-hidden="true"></span><label class="field"><span class="sr-only">Nome do assunto ${i + 1}</span><input value="${esc(c.name)}" maxlength="40" required data-auto-input="category-name" data-index="${i}" placeholder="Nome do assunto"></label><label class="field automation-color"><span class="sr-only">Cor</span><select data-auto-input="category-color" data-index="${i}">${COLORS.map(([v, label]) => `<option value="${v}" ${c.color === v ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="field automation-desc"><span class="sr-only">Quando usar</span><input value="${esc(c.description)}" maxlength="200" data-auto-input="category-description" data-index="${i}" placeholder="Quando usar (ajuda a IA a decidir)"></label><span class="automation-row-actions"><button type="button" class="icon-btn" data-action="auto-move" data-index="${i}" data-dir="-1" aria-label="Subir ${esc(c.name)}" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="icon-btn" data-action="auto-move" data-index="${i}" data-dir="1" aria-label="Descer ${esc(c.name)}" ${i === total - 1 ? 'disabled' : ''}>↓</button><button type="button" class="icon-btn" data-action="auto-remove" data-index="${i}" aria-label="Remover ${esc(c.name)}" ${total <= 1 ? 'disabled' : ''}>✕</button></span></li>`;
  }
  function page() {
    const head = heading('Automação', 'Mensagens automáticas e assuntos das conversas do WhatsApp.');
    if (isExample()) return head + '<div class="notice">A automação usa o WhatsApp real. Abra os dados reais para configurar.</div>';
    if (!draft) { if (!loading && !error) void load(); return head + (error ? `<div class="notice red" role="alert">${esc(error)} ${btn('Tentar de novo', 'auto-reload', '', 'secondary sm')}</div>` : '<p class="muted">Carregando a automação…</p>'); }
    const d = draft, dirty = JSON.stringify(d) !== JSON.stringify(config);
    return head + `<form novalidate data-form="wa-automation" class="automation">
      <section class="card automation-card"><div class="automation-head"><div><span class="eyebrow">Quando a cliente só cumprimenta</span><h2>Boas-vindas automática</h2><p class="muted">Se a cliente mandar só "oi", "bom dia" ou "tudo bem?" e não disser o que precisa, o sistema espera um pouco e pergunta como pode ajudar. Uma vez por atendimento.</p></div>${toggle('greeting', d.greeting.enabled)}</div>
        <div class="automation-grid"><label class="field full"><span>Mensagem</span><textarea class="resize-none" rows="2" maxlength="1000" data-auto-input="greeting-text">${esc(d.greeting.text)}</textarea><small class="muted">Use {nome} para o primeiro nome da cliente (sai sem nome quando não houver).</small></label><label class="field"><span>Esperar antes de enviar</span>${select('greeting-delay', GREETING_DELAYS, d.greeting.delay)}</label>${bubble(sample(d.greeting.text))}</div></section>
      <section class="card automation-card"><div class="automation-head"><div><span class="eyebrow">Quando você não pode responder agora</span><h2>Estou ocupada</h2><p class="muted">Com o seletor ligado, depois que a cliente diz o que precisa, ela recebe este aviso. Uma vez por atendimento. O mesmo seletor aparece em Atendimentos → WhatsApp.</p></div>${toggle('busy', d.busy.enabled)}</div>
        <div class="automation-grid"><label class="field full"><span>Mensagem</span><textarea class="resize-none" rows="3" maxlength="1000" data-auto-input="busy-text">${esc(d.busy.text)}</textarea></label><label class="field"><span>Enviar depois da última mensagem dela</span>${select('busy-delay', BUSY_DELAYS, d.busy.delay)}</label>${bubble(sample(d.busy.text))}</div></section>
      <section class="card automation-card"><div class="automation-head"><div><span class="eyebrow">Separar por assunto</span><h2>Assuntos das conversas</h2><p class="muted">A IA lê cada mensagem nova, escolhe o assunto e resume o que a cliente quer. A lista de conversas fica separada por estes assuntos, nesta ordem. Você pode trocar o assunto de uma conversa à mão.</p></div>${toggle('classify', d.classify.enabled, ['IA desligada', 'IA ligada'])}</div>
        <ol class="automation-categories">${d.categories.map((c, i) => categoryRow(c, i, d.categories.length)).join('')}</ol>
        <div class="row wrap gap8">${d.categories.length < 20 ? btn('Adicionar assunto', 'auto-add', 'plus', 'secondary sm') : ''}${btn('Restaurar a lista padrão', 'auto-defaults', 'undo', 'text sm')}</div></section>
      <div class="automation-actions ${dirty ? 'dirty' : ''}"><p id="automation-error" class="small" role="alert">${esc(error)}</p><span class="small muted">${dirty ? 'Há alterações não salvas.' : 'Tudo salvo.'}</span>${btn('Descartar', 'auto-discard', '', 'secondary', dirty && !saving ? '' : 'disabled')}<button type="submit" class="btn primary" ${dirty && !saving ? '' : 'disabled'}>${saving ? 'Salvando…' : 'Salvar alterações'}</button></div>
    </form>`;
  }
  async function save(patch, message) {
    if (saving) return;
    saving = true; error = ''; rerender();
    try { config = await request('POST', patch); const keep = draft; draft = clone(config); if (patch.greeting?.enabled === undefined && patch.busy?.enabled === undefined && patch.classify?.enabled === undefined) { /* salvou tudo */ } else if (keep) { for (const k of ['greeting', 'busy']) { draft[k].text = keep[k].text; draft[k].delay = keep[k].delay; } draft.categories = keep.categories; } onSaved?.(config); toast(message); }
    catch (e) { error = e.message; }
    finally { saving = false; rerender(); }
  }
  /** Lê o que está na tela para o rascunho (sem salvar). */
  function read(input) {
    const name = input.dataset.autoInput, i = Number(input.dataset.index);
    if (name === 'greeting-text') draft.greeting.text = input.value;
    if (name === 'busy-text') draft.busy.text = input.value;
    if (name === 'greeting-delay') draft.greeting.delay = Number(input.value);
    if (name === 'busy-delay') draft.busy.delay = Number(input.value);
    if (name === 'category-name') draft.categories[i].name = input.value;
    if (name === 'category-description') draft.categories[i].description = input.value;
    if (name === 'category-color') draft.categories[i].color = input.value;
  }
  function install() {
    document.addEventListener('input', e => { const input = e.target.closest?.('[data-auto-input]'); if (!input || !draft) return; read(input); const form = input.closest('form'); const dirty = JSON.stringify(draft) !== JSON.stringify(config); form.querySelector('[type=submit]').disabled = !dirty || saving; form.querySelector('[data-action="auto-discard"]').disabled = !dirty || saving; form.querySelector('.automation-actions .muted').textContent = dirty ? 'Há alterações não salvas.' : 'Tudo salvo.'; form.querySelector('.automation-actions').classList.toggle('dirty', dirty); const preview = input.closest('.automation-grid')?.querySelector('.automation-preview p'); if (preview && /-text$/.test(input.dataset.autoInput)) preview.textContent = sample(input.value); });
    document.addEventListener('change', e => { const input = e.target.closest?.('[data-auto-input]'); if (!input || !draft) return; read(input); if (input.dataset.autoInput === 'category-color') rerender(); });
    document.addEventListener('click', e => {
      const b = e.target.closest?.('[data-action^="auto-"]'); if (!b) return;
      const a = b.dataset.action, i = Number(b.dataset.index);
      if (a === 'auto-reload') { error = ''; void load(); }
      if (!draft) return;
      if (a === 'auto-toggle') { const on = b.dataset.value === 'true', name = b.dataset.name; if (draft[name].enabled === on) return; void save({ [name]: { enabled: on } }, { greeting: on ? 'Boas-vindas automática ligada.' : 'Boas-vindas automática desligada.', busy: on ? 'Aviso de ocupada ligado.' : 'Aviso de ocupada desligado.', classify: on ? 'Separação por assunto com IA ligada.' : 'IA desligada: as conversas ficam sem assunto automático.' }[name]); }
      if (a === 'auto-add') { draft.categories.push({ name: '', color: 'purple', description: '' }); rerender(); document.querySelector(`[data-auto-input="category-name"][data-index="${draft.categories.length - 1}"]`)?.focus(); }
      if (a === 'auto-remove' && draft.categories.length > 1) { draft.categories.splice(i, 1); rerender(); }
      if (a === 'auto-move') { const j = i + Number(b.dataset.dir); if (j < 0 || j >= draft.categories.length) return; [draft.categories[i], draft.categories[j]] = [draft.categories[j], draft.categories[i]]; rerender(); document.querySelector(`[data-action="auto-move"][data-index="${j}"][data-dir="${b.dataset.dir}"]`)?.focus(); }
      if (a === 'auto-defaults') { void save({ categories: [] }, 'Lista padrão de assuntos restaurada.'); }
      if (a === 'auto-discard') { draft = clone(config); error = ''; rerender(); }
    });
    document.addEventListener('submit', e => {
      const form = e.target; if (form.dataset?.form !== 'wa-automation' || !draft) return;
      e.preventDefault();
      const names = draft.categories.map(c => c.name.trim());
      if (names.some(n => !n)) { error = 'Dê um nome a cada assunto ou remova a linha vazia.'; rerender(); return; }
      if (new Set(names.map(n => n.toLowerCase())).size !== names.length) { error = 'Há dois assuntos com o mesmo nome.'; rerender(); return; }
      if (!draft.greeting.text.trim() || !draft.busy.text.trim()) { error = 'Escreva o texto das duas mensagens automáticas.'; rerender(); return; }
      void save({ greeting: { text: draft.greeting.text, delay: draft.greeting.delay }, busy: { text: draft.busy.text, delay: draft.busy.delay }, categories: draft.categories }, 'Automação salva.');
    });
  }
  /** Página descartável: recarrega do servidor ao abrir de novo, mantendo o rascunho se houver alteração. */
  function opened() { if (draft && JSON.stringify(draft) === JSON.stringify(config)) { draft = null; config = null; } }
  return { page, install, opened, dirty: () => !!draft && JSON.stringify(draft) !== JSON.stringify(config) };
}

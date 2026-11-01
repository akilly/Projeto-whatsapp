import { validateVisibleControls } from './form-validation.js';
import { deletionPlan, allCollections } from './deletion.js';
/**
 * Interface do Hanne Essencial: Atendimentos (WhatsApp + notas internas), Orçamentos, Tarefas, Estoque e Serviços.
 * Fluxo: bootstrap carrega a API; render desenha a página; eventos data-action/data-form alteram uma cópia do estado;
 * queueSave/flushSave persistem com revisão. O canal WhatsApp usa APIs próprias e armazenamento separado.
 * Não há cadastro de clientes: orçamentos, tarefas e notas guardam o contato (nome e telefone) e a origem.
 * Valores dos usuários passam por esc antes de compor HTML.
 */
import { destinationHref, parseDestination, validCalendarDate, recordPage } from './navigation.js';
import { waURL, waPhone, waMessages } from './wa-link.js';
import { createWhatsAppUI } from './whatsapp.js';
import { preferredTheme, applyTheme } from './theme.js';
import { blankState, stockOf, stockEntry, recost, lowStock as lowStockOf, validateState, cents, amount, qty, QUOTE_STATUS, PRIORITIES, TASK_AREAS, MOVEMENT_TYPES, makeContact, contactIssue, knownContacts, sameContact, phoneDigits } from './domain.js';
import { localDate, csvCell } from './core.js';
// Catálogo SVG local; coordenadas são dados visuais e não regras de negócio.
const icons = { grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z M7 10h9 M7 14h5', calendar: 'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z M7 3v4 M17 3v4 M3 10h18 M7 14h2 M13 14h3 M7 17h2', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.87', scissors: 'M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M8.1 7.1 21 20 M8.1 16.9 21 4 M12 12h.01', wallet: 'M21 8H5a2 2 0 0 1 0-4h14v4 M3 6v13a2 2 0 0 0 2 2h16V8 M21 12h-6v5h6 M17 14.5h.01', file: 'M14 2H5v20h14V7Z M14 2v6h5 M8 12h8 M8 16h6', checklist: 'M9 5h12 M9 12h12 M9 19h12 M2 4l2 2 3-3 M2 11l2 2 3-3 M2 18l2 2 3-3', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 2h4l1 3 3 1 3-1 2 4-2 3v2l2 3-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-3v-2L1 9l2-4 3 1 3-1Z', help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M9 9a3 3 0 1 1 5 2c-2 1-2 1-2 3 M12 17h.01', search: 'M21 21l-5-5 M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4', plus: 'M12 5v14 M5 12h14', arrow: 'M5 12h14 M14 7l5 5-5 5', chevron: 'm9 5 7 7-7 7', left: 'm15 5-7 7 7 7', down: 'm6 9 6 6 6-6', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2', moon: 'M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4', spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z M20 2v4 M18 4h4', shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z M8 12l3 3 5-6', leaf: 'M20 3C9 2 2 6 4 14c2 7 16 7 16-11Z M4 20 16 8', check: 'm5 12 4 4L19 6', download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4', upload: 'M12 16V4 M7 9l5-5 5 5 M4 17v4h16v-4', close: 'm6 6 12 12 M6 18 18 6', edit: 'm15 4 5 5 M4 16l-1 5 5-1L21 7a2.8 2.8 0 0 0-4-4Z', copy: 'M8 8h13v13H8z M16 8V3H3v13h5', info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 11v6 M12 7h.01', warning: 'M12 3 1 21h22Z M12 9v5 M12 17h.01', dots: 'M5 12h.01 M12 12h.01 M19 12h.01', menu: 'M3 6h18 M3 12h18 M3 18h18', coffee: 'M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z M17 8h2a3 3 0 0 1 0 6h-2 M7 2v3 M12 2v3', lock: 'M5 10h14v12H5z M8 10V6a4 4 0 0 1 8 0v4', link: 'm10 14 4-4 M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0 M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0', image: 'M3 3h18v18H3Z m3 14 4-5 4 4 3-3 4 4 M8 7h.01', heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z', print: 'M6 8V2h12v6 M6 17H3V8h18v9h-3 M6 13h12v9H6Z', undo: 'M3 3v6h6 M3 9a9 9 0 1 1 0 6' };
/**
 * icon — Produz o SVG de um ícone do catálogo local, com alternativa para nome desconhecido.
 */
const icon = (n, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[n] || icons.file}"/></svg>`;
/**
 * esc — Escapa texto inserido em HTML e atributos para impedir que dados do usuário sejam interpretados como marcação.
 */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/**
 * money — Formata valores em reais para leitura na interface; não realiza cálculo financeiro.
 */
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
/**
 * fmt — Formata uma data ISO ao meio-dia para exibição em português.
 */
const fmt = (v, opts = { day: '2-digit', month: 'short' }) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR', opts);
/**
 * longDate — Exibe a data por extenso com dia da semana.
 */
const longDate = v => fmt(v, { weekday: 'long', day: 'numeric', month: 'long' });
/**
 * initials — Extrai até duas iniciais do nome para o avatar.
 */
const initials = n => n.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('');
/**
 * uid — Gera um identificador único para um novo registro.
 */
const uid = () => crypto.randomUUID();
// Tema é preferência do dispositivo e não altera o snapshot financeiro.
let theme = applyTheme(preferredTheme(globalThis.localStorage), document.documentElement, null);

/** Alternância explícita com estado acessível para teclado e leitor de tela. */
function themeControl() {
    return `<div class="theme-control" role="group" aria-label="Tema da interface">${[['light', 'sun', 'Claro'], ['dark', 'moon', 'Escuro']].map(([value, symbol, label]) => `<button type="button" data-action="v5-theme" data-theme="${value}" aria-label="Tema ${label.toLowerCase()}" aria-pressed="${theme === value}" class="${theme === value ? 'active' : ''}">${icon(symbol)}<span>${label}</span></button>`).join('')}</div>`;
}

// Seleciona base real ou exemplo a partir da URL e da preferência local, sem copiar registros entre bases.
// Os dados reais são o padrão: a demonstração só abre por escolha explícita, evitando registros reais na base fictícia.
let dataset = 'real';
try {
    const mode = new URLSearchParams(location.search).get('dados'), saved = localStorage.getItem('hanne-data-view');
    dataset = mode === 'reais' ? 'real' : mode === 'exemplo' ? 'example' : saved === 'example' ? 'example' : 'real';
}
catch { }
/**
 * stateURL — Escolhe a API da base real ou da demonstração sem misturar os registros.
 */
const stateURL = () => dataset === 'example' ? '/api/state?dataset=example' : '/api/state';
// Estado de trabalho em memória e controle da revisão confirmada. Em caso de conflito, o rascunho continua em memória para recuperação.
let state = blankState(), revision = 0, confirmedState = structuredClone(state), syncStatus = 'loading', syncError = '', saving = false, savePending = false, lastSavedAt = null, lastSaveMessage = '';
// Filtros e navegação transitórios.
const ui = { page: 'dashboard', mobile: false, convFilter: 'all', conversationId: '', threadOpen: false, quoteFilter: 'all', taskFilter: 'open', inventoryTab: 'products', inventoryScope: '', inventoryPageIndex: 1 };
let whatsappPending = 0;
// Aba WhatsApp (conector Baileys no computador do ateliê). O envio pelo link (wa-link.js) continua disponível.
const WHATSAPP_API = true;
ui.inboxView = WHATSAPP_API && dataset === 'real' ? 'whatsapp' : 'notes';
const whatsapp = createWhatsAppUI({ esc, btn: (...args) => btn(...args), field: (...args) => field(...args), openForm, modal, closeModal, toast, validate: validateVisibleControls,
    aiRun: (...args) => aiRun(...args), aiContext: (phone, name) => aiContext({ name, phone }), categoryColor: cat => categoryColor(cat),
    isExample: () => dataset === 'example',
    onCreate: (kind, data) => createFromWhatsApp(kind, data),
    confirmLeaving: proceed => confirmLeaving('Há um rascunho de mensagem. Deseja sair desta tela?', proceed),
    onPending: count => { whatsappPending = count; for (const el of document.querySelectorAll?.('[data-pending-total]') || []) { const total = pendingConvs().length + count; el.textContent = total; el.hidden = !total; } for (const el of document.querySelectorAll?.('[data-wa-pending]') || []) el.textContent = count; for (const el of document.querySelectorAll?.('[data-indicator="pending-conversations"]') || []) el.textContent = pendingConvs().length + count; }
});
whatsapp.install();
let currentDetailTarget = null, leaveConfirmation = null, modalOpener = null, modalReturnHref = null;

/** Explica as ações e os conceitos da tela atual, sem exigir a leitura de um manual separado. */
function pageGuide() {
    const guides = {
        dashboard: ['Comece pelos atendimentos pendentes e siga para orçamentos e tarefas.', [['Atendimentos', 'Conversas do WhatsApp e notas internas que ainda não foram resolvidas.'], ['Orçamentos e tarefas', 'Crie direto de uma conversa: o contato e a origem já vêm preenchidos.'], ['Estoque', 'Produtos com saldo igual ou abaixo do mínimo aparecem aqui para reposição.']]],
        conversations: ['Organize os contatos que precisam de resposta e registre o próximo passo.', [['WhatsApp', 'Recebe e envia após instalar o conector Baileys e ler o QR Code. O conector precisa continuar ligado.'], ['Notas internas', 'Registre pedidos que chegaram por outros canais e acompanhe com notas. Nada é enviado à cliente.'], ['Criar orçamento ou tarefa', 'Os botões na conversa levam o nome, o telefone e o vínculo com a conversa.']]],
        quotes: ['Registre o pedido e acompanhe a avaliação antes de combinar o atendimento.', [['Contato', 'Nome e telefone de quem pediu. Se veio de uma conversa, o botão “Abrir conversa” volta para ela.'], ['Avaliação', 'Atualize a situação. Para marcar como avaliado, defina o valor.'], ['Perguntas', 'Escreva o que falta saber e envie pelo WhatsApp com a mensagem pronta.']]],
        tasks: ['Use para lembrar atividades que precisam de acompanhamento.', [['Pendente', 'Atividade ainda não concluída. Prazo passado aparece como atraso.'], ['Concluir', 'Marque o círculo quando terminar; a atividade fica no filtro Concluídas.'], ['Vínculos', 'A tarefa pode guardar o contato, a conversa de origem e o orçamento relacionado.']]],
        inventory: ['Cadastre o saldo real dos produtos e registre entradas e saídas quando acontecerem.', [['Saldo inicial', 'Quantidade que já existe, inclusive embalagens abertas, em g, ml ou unidades.'], ['Entrada e uso', 'Entrada soma ao estoque (com custo, se souber). Uso e perda reduzem o saldo. Tudo é lançado à mão.'], ['Custo a conferir', 'Significa que falta informação de custo; não é tratado como custo zero.']]],
        services: ['Mantenha o catálogo com descrição, duração e orientações.', [['Catálogo', 'Os serviços aparecem nos orçamentos.'], ['Orientações', 'Antes e depois do procedimento: úteis para responder às clientes.'], ['Excluir', 'Orçamentos que usavam o serviço guardam o nome dele.']]],
        settings: ['Ajuste aparência, conta, salões e conexões.', [['Seus dados', 'Confira o indicador de sincronização. Os exemplos e os dados reais ficam em bases separadas.'], ['Salões', 'Cada salão tem login e dados próprios.'], ['Cópias', 'Exporte CSV, PDF ou a cópia completa JSON.']]]
    };
    const guide = guides[ui.page];
    return guide ? `<details class="page-guide"><summary>${icon('help')}<span>Como usar esta tela</span>${icon('down')}</summary><div><p>${esc(guide[0])}</p><dl>${guide[1].map(([title, text]) => `<div><dt>${esc(title)}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl></div></details>` : '';
}
/** Serviço pelo id; orçamentos com serviço excluído usam o nome guardado. */
const service = id => state.services.find(s => s.id === id) || { name: 'Serviço', duration: 0 };
const serviceLabel = q => q.serviceId ? service(q.serviceId).name : (q.serviceName || 'A definir');
const contactName = c => c?.name || 'Sem contato';
/**
 * avatar — Renderiza o avatar com nome e cor escapados.
 */
const avatar = (c, size = '') => `<span class="avatar ${esc(c.color || 'olive')} ${size}" aria-hidden="true">${esc(initials(c.name))}</span>`;
/**
 * pill — Renderiza uma etiqueta visual de texto com indicador opcional.
 */
const pill = (t, color = 'gray', dot = false) => `<span class="pill ${color}">${dot ? '<i class="dot"></i>' : ''}${esc(t)}</span>`;
/**
 * btn — Monta botão com ação delegada por data-action; o conteúdo de texto é definido pelos chamadores.
 */
const btn = (t, action, ic = '', type = 'secondary', extra = '') => `<button type="button" class="btn ${type}" data-action="${action}" ${extra}>${ic ? icon(ic) : ''}${t}</button>`;
/**
 * iconBtn — Monta botão de ícone com nome acessível e atributos auxiliares.
 */
const iconBtn = (n, action, label, extra = '') => { const match = extra.match(/class="([^"]*)"/); return `<button type="button" class="icon-btn ${match?.[1] || ''}" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra.replace(/class="[^"]*"/, '')}>${icon(n)}</button>`; };
/**
 * empty — Renderiza uma mensagem de lista vazia.
 */
const empty = (title, text = '', ic = 'leaf') => `<div class="empty">${icon(ic)}<strong>${esc(title)}</strong>${esc(text)}</div>`;
/**
 * pendingConvs — Conta como pendente toda conversa que ainda não está resolvida, inclusive as que aguardam retorno.
 */
const pendingConvs = () => state.conversations.filter(v => v.status !== 'resolved');
/**
 * plural — Concorda o substantivo com a quantidade exibida.
 */
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const lowStock = () => lowStockOf(state);
const lowStockRow = p => `<button class="task-row attention-button" data-action="product-detail" data-id="${p.id}">${icon('warning')}<span class="grow">${esc(p.name)}<small class="table-sub">Estoque baixo</small></span>${pill(stockNumber(stockOf(state, p.id).quantity) + ' ' + p.unit, 'red')}</button>`;
const lateTasks = () => state.tasks.filter(t => !t.done && t.due < localDate());
const todayTasks = () => state.tasks.filter(t => !t.done && t.due === localDate());
const openQuotes = () => state.quotes.filter(q => ['missing', 'review'].includes(q.status));
const urgentConvs = () => pendingConvs().filter(v => ['Segurança', 'Agendamento urgente', 'Reclamação'].includes(v.category));
const alertCount = () => urgentConvs().length + lateTasks().length + lowStock().length;
const categoryColor = cat => cat === 'Segurança' ? 'red' : cat === 'Agendamento urgente' ? 'orange' : cat === 'Orçamento' ? 'orange' : cat === 'Pós-procedimento' ? 'green' : cat === 'Reclamação' ? 'red' : 'gray';
/* ---------- Inteligência artificial (Workers AI, sempre como sugestão) ---------- */
const AI_CATEGORIES = ['Segurança', 'Agendamento urgente', 'Agendamento', 'Pós-procedimento', 'Orçamento', 'Informações gerais', 'Reclamação', 'Exige esclarecimentos', 'Spam ou suspeita'];
let aiBusy = '';
let aiStatus = null, accountEmail = '', accountRole = '', emailDelivery = false;
// Salões cadastrados e convites pendentes (só a titular recebe esta lista do servidor).
let salons = null;
/** Carrega, sem travar a tela, o estado da IA, a conta e (para a titular) os salões. Usados em Configurações. */
async function loadAccountInfo() {
    try { const r = await fetch('/api/auth/status', { cache: 'no-store' }); if (r.ok) { const info = await r.json(); accountEmail = info.email || ''; accountRole = info.role || ''; emailDelivery = !!info.emailEnabled; } } catch { /* opcional */ }
    if (accountRole === 'admin') await loadSalons();
    try { const r = await fetch('/api/ai/status', { cache: 'no-store' }); aiStatus = r.ok ? await r.json() : { enabled: false }; } catch { aiStatus = { enabled: false }; }
    if (ui.page === 'settings') render();
}
/** Troca de senha: formulário próprio (não mexe nos registros do ateliê). */
function passwordForm() {
    const input = (label, name, auto) => `<label class="field full"><span>${label}</span><input type="password" name="${name}" data-label="${label}" autocomplete="${auto}" required minlength="${name === 'currentPassword' ? 1 : 12}" maxlength="200"></label>`;
    modal('Trocar senha', `<form id="password-form" novalidate><div class="dialog-body form-grid">${input('Senha atual', 'currentPassword', 'current-password')}${input('Nova senha (mínimo 12 caracteres)', 'newPassword', 'new-password')}${input('Confirme a nova senha', 'repeatPassword', 'new-password')}<p class="notice full">Depois da troca, os outros aparelhos precisam entrar de novo com a nova senha. Este continua conectado.</p><p id="password-error" role="alert" class="full small" style="color:var(--red)"></p></div><div class="dialog-footer">${btn('Cancelar', 'close-modal', '', 'secondary')}<button type="submit" class="btn primary">${icon('lock')}Salvar nova senha</button></div></form>`);
}
document.addEventListener('submit', async e => {
    const form = e.target;
    if (form.id !== 'password-form') return;
    e.preventDefault();
    const error = form.querySelector('#password-error'), button = form.querySelector('[type=submit]');
    error.textContent = '';
    if (!validateVisibleControls(form)) return;
    if (form.elements.newPassword.value !== form.elements.repeatPassword.value) { error.textContent = 'A confirmação precisa ser igual à nova senha.'; form.elements.repeatPassword.focus(); return; }
    button.disabled = true;
    try {
        const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: form.elements.currentPassword.value, newPassword: form.elements.newPassword.value }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível trocar a senha.');
        form.reset(); closeModal(true); toast('Senha trocada. Os outros aparelhos vão precisar entrar de novo.');
    }
    catch (err) { error.textContent = err.message; }
    finally { button.disabled = false; }
});
/* ---------- Conta: e-mail de acesso e salões (contas separadas) ---------- */
/** POST para /api/auth/{caminho}. Devolve o JSON ou lança erro com a mensagem do servidor. */
async function authPost(path, body) {
    const response = await fetch('/api/auth/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
    return data;
}
async function loadSalons() {
    try { const r = await fetch('/api/auth/users', { cache: 'no-store' }); salons = r.ok ? await r.json() : null; } catch { salons = null; }
    if (ui.page === 'settings') render();
}
/** Troca do e-mail de login: pede a senha atual; com envio de e-mail ativo, só muda depois da confirmação. */
function emailForm() {
    modal('Trocar e-mail de acesso', `<form id="email-form" novalidate><div class="dialog-body form-grid"><label class="field full"><span>Novo e-mail</span><input type="email" name="newEmail" data-label="Novo e-mail" autocomplete="email" required maxlength="254"></label><label class="field full"><span>Confirme o novo e-mail</span><input type="email" name="repeatEmail" data-label="Confirme o novo e-mail" autocomplete="off" required maxlength="254"></label><label class="field full"><span>Senha atual</span><input type="password" name="password" data-label="Senha atual" autocomplete="current-password" required maxlength="200"></label><p class="notice full">${emailDelivery ? 'Vamos enviar um link para o novo e-mail. A troca só vale depois que você abrir esse link; até lá, entre com o e-mail atual.' : 'O envio de e-mails não está configurado: o e-mail muda na hora. Confira com atenção, porque é ele que você vai digitar no login.'}</p><p id="email-error" role="alert" class="full small" style="color:var(--red)"></p></div><div class="dialog-footer">${btn('Cancelar', 'close-modal', '', 'secondary')}<button type="submit" class="btn primary">${icon('check')}${emailDelivery ? 'Enviar confirmação' : 'Trocar e-mail'}</button></div></form>`);
}
/** Convite de um salão novo: conta e dados separados; a pessoa cria a própria senha pelo link. */
function inviteForm() {
    modal('Convidar salão', `<form id="invite-form" novalidate><div class="dialog-body form-grid"><label class="field full"><span>E-mail de quem vai usar</span><input type="email" name="email" data-label="E-mail" autocomplete="off" required maxlength="254"></label><p class="notice full">O salão novo começa vazio: atendimentos, orçamentos, tarefas, estoque e WhatsApp são só dele. Você não vê os dados de lá, e ele não vê os seus. ${emailDelivery ? 'O link de convite vai por e-mail e vale 7 dias.' : 'Sem envio de e-mail configurado, você recebe o link aqui para mandar à pessoa (vale 7 dias).'}</p><p id="invite-error" role="alert" class="full small" style="color:var(--red)"></p></div><div class="dialog-footer">${btn('Cancelar', 'close-modal', '', 'secondary')}<button type="submit" class="btn primary">${icon('plus')}Criar convite</button></div></form>`);
}
function inviteLinkModal(link) {
    const local = /^https?:\/\/(127\.0\.0\.1|localhost)/.test(link);
    modal('Link de convite', `<div class="dialog-body form-grid"><label class="field full"><span>Envie este link para a pessoa (WhatsApp, por exemplo)</span><input id="invite-link" readonly value="${esc(link)}"></label><p class="notice full">O link só pode ser usado uma vez e vale 7 dias. Ele não aparece de novo depois que esta janela fechar; se perder, cancele e convide outra vez.${local ? ' Atenção: o Hanne está rodando no seu computador, então este link só abre nele. Para outra pessoa usar de outro aparelho, publique o Hanne na nuvem.' : ''}</p></div><div class="dialog-footer">${btn('Fechar', 'close-modal', '', 'secondary')}${btn('Copiar link', 'copy-invite', 'copy', 'primary')}</div>`);
}
/** Seção de Configurações visível só para a titular. */
function salonsSection() {
    if (accountRole !== 'admin') return '';
    const users = salons?.users || [], invites = salons?.invites || [];
    const userRow = u => `<div class="setting-row account-row"><div><strong>${esc(u.email)}</strong><p>${u.role === 'admin' ? 'Titular · convida e desativa salões' : 'Salão · dados próprios'}${u.createdAt ? ' · desde ' + new Date(u.createdAt).toLocaleDateString('pt-BR') : ''}</p></div><div class="row wrap gap8">${pill(u.you ? 'Você' : u.disabled ? 'Desativado' : 'Ativo', u.disabled ? 'gray' : 'green')}${u.role === 'admin' ? '' : btn(u.disabled ? 'Reativar' : 'Desativar', 'salon-access', u.disabled ? 'undo' : 'lock', 'secondary sm', `data-id="${esc(u.id)}" data-disabled="${u.disabled ? '0' : '1'}"`)}</div></div>`;
    const inviteRow = i => `<div class="setting-row account-row"><div><strong>${esc(i.email)}</strong><p>Convite pendente · vale até ${new Date(i.expiresAt).toLocaleDateString('pt-BR')}</p></div><div class="row wrap gap8">${pill('Aguardando', 'orange')}${btn('Cancelar convite', 'cancel-invite', 'close', 'secondary sm', `data-email="${esc(i.email)}"`)}</div></div>`;
    return `<section class="card settings-card" id="saloes"><div class="row between wrap gap8"><h2>Salões</h2>${btn('Convidar salão', 'invite-salon', 'plus', 'primary sm')}</div><p class="small muted">Cada salão entra com o próprio e-mail e senha e tem atendimentos, orçamentos, tarefas, estoque e WhatsApp separados. Desativar só bloqueia o acesso: os dados ficam guardados.</p>${salons ? users.map(userRow).join('') + invites.map(inviteRow).join('') : '<p class="small muted">Carregando…</p>'}</section>`;
}
document.addEventListener('submit', async e => {
    const form = e.target;
    if (form.id !== 'email-form' && form.id !== 'invite-form') return;
    e.preventDefault();
    const error = form.querySelector('[role=alert]'), button = form.querySelector('[type=submit]');
    error.textContent = '';
    if (!validateVisibleControls(form)) return;
    if (form.id === 'email-form' && form.elements.newEmail.value.trim().toLowerCase() !== form.elements.repeatEmail.value.trim().toLowerCase()) { error.textContent = 'Os dois e-mails precisam ser iguais.'; form.elements.repeatEmail.focus(); return; }
    button.disabled = true;
    try {
        if (form.id === 'email-form') {
            const data = await authPost('change-email', { newEmail: form.elements.newEmail.value, password: form.elements.password.value });
            if (data.email) accountEmail = data.email;
            form.reset(); closeModal(true); toast(data.message); if (ui.page === 'settings') render();
        } else {
            const data = await authPost('invite', { email: form.elements.email.value });
            form.reset(); closeModal(true);
            if (data.link) inviteLinkModal(data.link); else toast(data.message);
            void loadSalons();
        }
    }
    catch (err) { error.textContent = err.message; }
    finally { button.disabled = false; }
});
/** Chama /api/ai/{tarefa}. Erros chegam com a mensagem do servidor (cota, IA desligada, etc.). */
async function aiRun(task, messages, context = {}) {
    const response = await fetch('/api/ai/' + task, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, context }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'A IA não respondeu agora. Tente de novo em instantes.');
    return data;
}
/** Contexto da cliente enviado à IA: só o necessário para um resumo ou resposta melhores. */
/** Contexto enviado à IA: nome do ateliê, contato e o que está em aberto para ele (orçamentos e tarefas). */
function aiContext(contact) {
    const base = { salonName: state.settings.name };
    if (!contact?.name) return base;
    const quotes = state.quotes.filter(q => sameContact(q.contact, contact) && ['missing', 'review', 'approved'].includes(q.status)).map(q => `orçamento de ${serviceLabel(q)} (${QUOTE_STATUS[q.status]}${q.value ? ', ' + money(q.value) : ''})`);
    const tasks = state.tasks.filter(t => !t.done && sameContact(t.contact, contact)).map(t => 'tarefa: ' + t.title);
    return { ...base, clientName: contact.name, notes: [...quotes, ...tasks].join(' · ') };
}
const aiNoteMessages = v => v.messages.map(m => ({ who: m.type === 'note' ? 'nota' : 'cliente', text: m.text }));
async function aiNote(task, id) {
    const v = state.conversations.find(x => x.id === id);
    if (!v || aiBusy) return;
    aiBusy = task + ':' + id; render();
    try {
        const result = await aiRun(task, aiNoteMessages(v), aiContext(v.contact));
        const fresh = state.conversations.find(x => x.id === id);
        if (!fresh) return;
        if (task === 'summary') { fresh.summary = result.summary; fresh.summaryAI = true; audit('Resumo gerado pela IA', '', fresh.contact.name); persist('Resumo da IA salvo. Confira antes de usar.'); }
        if (task === 'reply') { fresh.draft = result.reply; audit('Resposta sugerida pela IA', '', fresh.contact.name); persist('Sugestão da IA salva como rascunho. Revise antes de enviar.'); }
    }
    catch (e) { toast(e.message); }
    finally { aiBusy = ''; render(); }
}
// Temporizador da mensagem de confirmação exibida no navegador.
let toastTimer;
function toast(t) { const el = document.getElementById('toast'); el.textContent = t; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000); }
function persist(message, form = null) { const accepted = queueSave(message); if (accepted && form?.dataset) form.dataset.dirty = ''; return accepted; }
function audit(action, before = '', after = '') { state.audit.unshift({ id: uid(), at: new Date().toISOString(), action, before, after, by: dataset === 'example' ? 'Profissional · demonstração' : 'Profissional' }); state.audit = state.audit.slice(0, 200); }
function go(page) { navigateTo({ page }); }

function destinationLink(content, target, classes = 'name-link', label = '') {
    return `<a class="destination-link ${classes}" href="${esc(destinationHref(target))}" data-action="v7-route" data-route="${esc(JSON.stringify(target))}" ${label ? `aria-label="${esc(label)}"` : ''}>${content}</a>`;
}
function currentDestination() {
    if (ui.page === 'inventory') return { page: 'inventory', tab: ui.inventoryTab, scope: ui.inventoryScope, p: ui.inventoryPageIndex };
    if (ui.page === 'quotes') return { page: 'quotes', scope: ui.quoteFilter === 'all' ? '' : ui.quoteFilter };
    if (ui.page === 'tasks') return { page: 'tasks', scope: ui.taskFilter === 'open' ? '' : ui.taskFilter };
    return { page: ui.page };
}
function openDestinationDetail(target) {
    if (target.product || target.quote || target.task || target.service) currentDetailTarget = target;
    if (target.product) return state.products.some(p => p.id === target.product) ? productDetail(target.product) : missing();
    if (target.quote) return state.quotes.some(q => q.id === target.quote) ? quoteForm(target.quote) : missing();
    if (target.task) return state.tasks.some(t => t.id === target.task) ? taskForm(target.task) : missing();
    if (target.service) return state.services.some(s => s.id === target.service) ? serviceForm(target.service) : missing();
}
function missing() { modal('Registro não encontrado', `<div class="dialog-body"><p>Este registro foi excluído ou ainda não foi sincronizado neste aparelho.</p></div>`, btn('Fechar', 'close-modal')); }

function navigateTo(target, { replace = false, restored = null, discarded = false, scrollY = 0 } = {}) {
    if (!target?.page) return;
    if (!discarded && document.querySelector?.('#dialog form')?.dataset.dirty === 'true') {
        confirmLeaving('Há alterações nesta ficha que ainda não foram salvas. Deseja descartá-las para abrir outro registro?', () => navigateTo(target, { replace, restored, discarded: true, scrollY }));
        return;
    }
    const openerHref = document.activeElement?.closest?.('a[data-action="v7-route"]')?.getAttribute('href');
    if (!restored) globalThis.history?.replaceState?.({ hanneUI: structuredClone(ui), target: currentDetailTarget || currentDestination(), scrollY: window.scrollY || 0 }, '');
    closeModal(true);
    if (restored) Object.assign(ui, restored);
    else {
        ui.page = target.page; ui.mobile = false; ui.threadOpen = false;
        if (target.page === 'inventory') { ui.inventoryTab = target.tab === 'movements' ? 'movements' : 'products'; ui.inventoryScope = ['low', 'unknown'].includes(target.scope) ? target.scope : ''; ui.inventoryPageIndex = Number(target.p) || 1; }
        if (target.page === 'quotes' && target.scope !== undefined) ui.quoteFilter = QUOTE_STATUS[target.scope] || target.scope === 'open' ? target.scope : 'all';
        if (target.page === 'tasks' && target.scope !== undefined) ui.taskFilter = ['done', 'all', 'late'].includes(target.scope) ? target.scope : 'open';
    }
    render();
    if (!restored) globalThis.history?.[replace ? 'replaceState' : 'pushState']?.({ hanneUI: structuredClone(ui), target }, '', destinationHref({ ...currentDestination(), ...target }));
    openDestinationDetail(target);
    if (document.getElementById('dialog')) modalReturnHref = openerHref || null;
    if (!document.getElementById('dialog')) {
        const h1 = document.querySelector?.('#main h1');
        h1?.setAttribute('tabindex', '-1'); h1?.focus?.({ preventScroll: true });
        window.scrollTo(0, restored ? scrollY : 0);
    }
}
window.addEventListener('popstate', e => {
    const target = e.state?.target || parseDestination(location.hash || '') || { page: 'dashboard' };
    navigateTo(target, { replace: true, restored: e.state?.hanneUI || null, scrollY: e.state?.scrollY || 0 });
});
// Destinos e ícones da navegação principal.
const navItems = [['dashboard', 'grid', 'Visão geral'], ['conversations', 'chat', 'Atendimentos'], ['quotes', 'file', 'Orçamentos'], ['tasks', 'checklist', 'Tarefas'], ['inventory', 'leaf', 'Estoque'], ['services', 'scissors', 'Serviços']];
function render() {
    const pageName = navItems.find(n => n[0] === ui.page)?.[2] || 'Configurações';
    const pendingTotal = pendingConvs().length + whatsappPending;
    const navButton = ([id, symbol, label]) => `<button type="button" data-action="nav" data-page="${id}" class="${ui.page === id ? 'active' : ''}" ${ui.page === id ? 'aria-current="page"' : ''} title="${label}">${icon(symbol)}<span>${label}</span>${id === 'conversations' ? `<b class="nav-count" data-pending-total ${pendingTotal ? '' : 'hidden'}>${pendingTotal}</b>` : ''}</button>`;
    document.title = `${dataset === 'example' ? 'Exemplos · ' : ''}${pageName} · Hanne`;
    document.getElementById('app').innerHTML = `
        <div class="mobile-shade ${ui.mobile ? 'visible' : ''}" data-action="mobile-menu"></div>
        <aside class="sidebar ${ui.mobile ? 'mobile-open' : ''}" aria-label="Navegação principal">
            <div class="brand"><div class="brand-mark">h</div><div><div class="brand-name">hanne<span>.</span></div><span class="brand-sub">Atendimento do ateliê</span></div></div>
            <nav class="nav" aria-label="Dia a dia"><div class="nav-label">Dia a dia</div>${navItems.slice(0, 4).map(navButton).join('')}</nav>
            <nav class="nav management-nav" aria-label="Gestão"><div class="nav-label">Gestão</div>${navItems.slice(4).map(navButton).join('')}</nav>
            <div class="sidebar-bottom">
                <div class="focus-box"><button type="button" class="focus-toggle" data-action="focus" role="switch" aria-checked="${state.focus}"><span>${icon('moon')} Modo de foco</span><span class="switch ${state.focus ? 'on' : ''}"></span></button><p>As prioridades continuam em destaque.</p></div>
                <nav class="nav" aria-label="Suporte"><button type="button" data-action="nav" data-page="settings" class="${ui.page === 'settings' ? 'active' : ''}" title="Configurações">${icon('settings')}<span>Configurações</span></button><button type="button" data-action="help" title="Ajuda e primeiros passos">${icon('help')}<span>Ajuda e primeiros passos</span></button></nav>
                <button type="button" class="demo-label" data-action="v3-dataset" data-dataset="${dataset === 'example' ? 'real' : 'example'}" title="${dataset === 'example' ? 'Voltar aos dados reais' : 'Abrir a demonstração com dados fictícios'}">${icon(dataset === 'example' ? 'spark' : 'shield')}<span>${dataset === 'example' ? 'Demonstração · voltar aos dados reais' : 'Dados reais · ver demonstração'}</span></button>
            </div>
        </aside>
        <div class="workspace">
            <header class="topbar">${iconBtn('menu', 'mobile-menu', 'Abrir navegação', 'class="mobile-menu"')}<nav class="breadcrumb" aria-label="Caminho da página"><ol>${ui.page !== 'dashboard' ? `<li>${destinationLink('Meu ateliê', { page: 'dashboard' }, 'breadcrumb-link')}${icon('chevron')}</li>` : ''}<li aria-current="page"><strong>${pageName}</strong></li></ol></nav>
                <div class="top-actions"><button type="button" class="search-trigger" data-action="search" aria-label="Buscar no sistema">${icon('search')}<span>Buscar...</span><kbd>⌘ K</kbd></button>${themeControl()}<span class="sync-dot ${syncStatus === 'saved' ? 'saved' : ''}" title="${syncStatus === 'saved' ? 'Registros sincronizados' : 'Conferir sincronização'}" aria-label="${syncStatus === 'saved' ? 'Registros sincronizados' : 'Conferir sincronização'}"></span>${(() => { const n = alertCount(); return `<button type="button" class="icon-btn bell-btn ${n ? 'notify' : ''}" data-action="alerts" aria-label="Central de alertas${n ? `: ${plural(n, 'alerta', 'alertas')}` : ''}" title="Central de alertas">${icon('bell')}${n ? `<b class="bell-count" aria-hidden="true">${n > 9 ? '9+' : n}</b>` : ''}</button>`; })()}<button type="button" class="account-button" data-action="nav" data-page="settings" aria-label="Abrir configurações"><span class="user-avatar">${esc(initials(state.settings.name))}</span><span class="user-meta">${esc(state.settings.name)}<small>Meu ateliê</small></span></button></div>
            </header>
            <main class="main" id="main" data-page="${ui.page}">${datasetBanner()}${syncBanner()}${state.focus ? `<div class="focus-banner">${icon('moon')}<span>Modo de foco ativo. Prioridades seguem visíveis.</span>${btn('Encerrar', 'focus', '', 'text')}</div>` : ''}${renderPage()}<p class="gentle-note">${icon('heart')}Seu tempo para o que importa.</p></main>
            <nav class="mobile-bottom-nav" aria-label="Atalhos do celular">${[['dashboard', 'grid', 'Início'], ['conversations', 'chat', 'Conversas'], ['quotes', 'file', 'Orçamentos'], ['tasks', 'checklist', 'Tarefas']].map(([id, symbol, label]) => `<button type="button" data-action="nav" data-page="${id}" class="${ui.page === id ? 'active' : ''}" ${ui.page === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${id === 'conversations' ? `<b class="nav-count" data-pending-total ${pendingTotal ? '' : 'hidden'}>${pendingTotal}</b>` : ''}</button>`).join('')}<button type="button" data-action="mobile-menu" aria-label="Abrir todas as áreas">${icon('menu')}<span>Mais</span></button></nav>
        </div>`;
    adaptTables();
    if (WHATSAPP_API) whatsapp.mount();
}
function adaptTables() {
    for (const table of document.querySelectorAll?.('#main .data-table') || []) {
        const headers = [...(table.tHead?.rows[0]?.cells || [])].map(cell => cell.textContent.trim());
        table.classList.add('adaptive-table');
        for (const row of table.tBodies[0]?.rows || []) [...row.cells].forEach((cell, index) => { if (cell.colSpan === 1) cell.dataset.label = headers[index] || ''; });
    }
}
function heading(title, subtitle, actions = '') {
    if (['services', 'conversations', 'quotes', 'tasks', 'inventory', 'settings'].includes(ui.page)) actions += btn('Excluir registro', 'v12-delete-list', '', 'text');
    const item = navItems.find(n => n[0] === ui.page), group = ['dashboard', 'conversations', 'quotes', 'tasks'].includes(ui.page) ? 'Seu dia a dia' : 'Gestão do ateliê';
    return `<div class="page-heading"><div><span class="page-kicker">${icon(item?.[1] || 'settings')}${group}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${actions ? `<div class="row wrap">${actions}</div>` : ''}</div>${pageGuide()}`;
}
function stat(title, value, detail, ic, target = null) {
    const content = `<div class="stat-head"><span class="stat-icon">${icon(ic)}</span>${title}</div><div class="stat-number">${value}</div><div class="stat-foot">${detail}</div>${target ? `<span class="stat-link-hint">Ver registros ${icon('arrow')}</span>` : ''}`;
    return target ? destinationLink(content, target, 'stat stat-link', `Ver registros: ${title}`) : `<article class="stat">${content}</article>`;
}
/** Etiqueta do contato com telefone e link para a origem (conversa do WhatsApp ou nota interna). */
function contactLine(contact, origin) {
    const parts = [contact?.phone ? esc(contact.phone) : ''];
    if (origin) parts.push(btn(origin.type === 'whatsapp' ? 'Abrir conversa do WhatsApp' : 'Abrir nota de atendimento', 'open-origin', 'chat', 'text sm', `data-type="${esc(origin.type)}" data-id="${esc(origin.id)}"`));
    return parts.filter(Boolean).join(' · ');
}

/* ---------- Visão geral ---------- */
function dashboard() {
    const today = todayTasks(), late = lateTasks(), quotes = openQuotes(), low = lowStock(), pending = pendingConvs(), priority = urgentConvs().length;
    const welcome = `<section class="atelier-welcome"><div class="welcome-copy"><span class="welcome-date">${icon('calendar')}${longDate(localDate())}</span><h1>Seu ateliê, <em>em dia.</em></h1><p>Olá, ${esc(state.settings.name)}. Conversas, orçamentos, tarefas e estoque em uma rotina mais leve.</p><div class="welcome-actions">${btn('Novo orçamento', 'new-quote', 'plus', 'primary')}${btn('Nova tarefa', 'new-task', 'plus', 'secondary')}</div><div class="welcome-routine">${destinationLink('01 · Atendimentos', { page: 'conversations' }, 'welcome-step')}<i></i>${destinationLink('02 · Orçamentos', { page: 'quotes' }, 'welcome-step')}<i></i>${destinationLink('03 · Tarefas', { page: 'tasks' }, 'welcome-step')}</div></div><div class="welcome-day"><div class="welcome-day-top"><span>Hoje, no seu espaço</span>${icon('sun')}</div>${destinationLink(String(today.length).padStart(2, '0') + '<small>tarefas para hoje</small>', { page: 'tasks' }, 'welcome-day-number', 'Ver tarefas de hoje')}<div class="welcome-day-bottom">${destinationLink(plural(late.length, 'atrasada', 'atrasadas'), { page: 'tasks', scope: 'late' }, 'welcome-count')}${destinationLink(plural(quotes.length, 'orçamento aberto', 'orçamentos abertos'), { page: 'quotes', scope: 'open' }, 'welcome-count')}</div>${btn('Ver tarefas', 'nav', 'arrow', 'text', 'data-page="tasks"')}</div></section>${WHATSAPP_API && dataset === 'real' ? `<button type="button" class="wa-dashboard-link" data-action="nav" data-page="conversations">${icon('chat')}WhatsApp · <span data-wa-pending>${whatsappPending}</span> conversas pendentes ${icon('arrow')}</button>` : ''}${pageGuide()}`;
    const attention = `<section class="attention-summary" aria-label="Pendências"><button class="attention-card ${priority ? 'has-priority' : ''}" data-action="open-pending" aria-label="${pending.length + whatsappPending} atendimentos pendentes: abrir conversas"><span class="attention-card-icon">${icon('chat')}</span><span class="grow"><span class="attention-card-label">Atendimentos pendentes</span><span class="attention-card-detail">${dataset === 'real' ? 'WhatsApp e notas ainda não resolvidas' : 'Conversas ainda não resolvidas'}</span><span class="attention-card-foot">Prioritários: ${priority} · Aguardando cliente: ${pending.filter(v => v.status === 'waiting').length}</span></span><strong class="attention-value" data-indicator="pending-conversations">${pending.length + whatsappPending}</strong>${icon('chevron')}</button>${destinationLink(`<span class="attention-card-icon">${icon('file')}</span><span class="grow"><span class="attention-card-label">Orçamentos em andamento</span><span class="attention-card-detail">Faltam informações ou em avaliação</span><span class="attention-card-foot">Faltam informações: ${quotes.filter(q => q.status === 'missing').length}</span></span><strong class="attention-value">${quotes.length}</strong>${icon('chevron')}`, { page: 'quotes', scope: 'open' }, 'attention-card')}</section>`;
    const stats = `<section class="stats">${stat('Tarefas para hoje', today.length, 'Pendentes com prazo hoje', 'checklist', { page: 'tasks' })}${stat('Tarefas atrasadas', late.length, 'Prazo vencido e não concluídas', 'clock', { page: 'tasks', scope: 'late' })}${stat('Orçamentos avaliados', state.quotes.filter(q => q.status === 'approved').length, 'Com valor definido por você', 'file', { page: 'quotes', scope: 'approved' })}${stat('Estoque baixo', low.length, 'Saldo igual ou abaixo do mínimo', 'warning', { page: 'inventory', scope: 'low' })}</section>`;
    const taskCard = `<section class="card"><header class="card-head"><div><h2>Tarefas</h2><p class="sub">Atrasadas e de hoje.</p></div>${btn('Ver todas', 'nav', 'arrow', 'text', 'data-page="tasks"')}</header>${[...late, ...today].slice(0, 6).map(t => `<div class="task-row"><button class="check" data-action="toggle-task" data-id="${t.id}" aria-label="Concluir ${esc(t.title)}"></button><span class="grow">${esc(t.title)}<small class="table-sub">${t.due < localDate() ? 'Atrasada · ' : ''}${fmt(t.due)}${t.contact ? ' · ' + esc(t.contact.name) : ''}</small></span>${pill(t.priority, t.priority === 'Alta' ? 'red' : t.priority === 'Média' ? 'orange' : 'gray')}</div>`).join('') || empty('Tudo em dia.', 'As próximas tarefas aparecerão aqui.', 'checklist')}</section>`;
    const quoteCard = `<section class="card"><header class="card-head"><div><h2>Orçamentos aguardando</h2><p class="sub">Faltam informações ou em avaliação.</p></div>${btn('Ver todos', 'nav', 'arrow', 'text', 'data-page="quotes"')}</header>${quotes.slice(0, 5).map(q => `<button class="task-row attention-button" data-action="edit-quote" data-id="${q.id}">${icon('file')}<span class="grow">${esc(contactName(q.contact))}<small class="table-sub">${esc(serviceLabel(q))} · ${fmt(q.date)}</small></span>${pill(QUOTE_STATUS[q.status], q.status === 'missing' ? 'orange' : 'gray')}</button>`).join('') || empty('Nenhum orçamento aguardando.', 'Crie um a partir de uma conversa.', 'file')}${low.length ? `<h3 class="section-gap">Estoque baixo</h3>${low.slice(0, 4).map(lowStockRow).join('')}` : ''}</section>`;
    return `${welcome}${attention}${stats}<div class="lower-grid">${taskCard}${quoteCard}</div>`;
}

/* ---------- Atendimentos ---------- */
/** Duas origens explícitas: mensagens reais do canal e anotações do aplicativo. */
function conversationsPage() {
    const real = dataset === 'real';
    const tabs = `<div class="wa-view-switch" role="group" aria-label="Origem dos atendimentos"><button type="button" class="btn ${ui.inboxView === 'whatsapp' ? 'primary' : 'secondary'}" data-action="inbox-mode" data-mode="whatsapp" aria-pressed="${ui.inboxView === 'whatsapp'}" ${real ? '' : 'disabled'}>WhatsApp ${real ? '' : '· abra os dados reais'}</button><button type="button" class="btn ${ui.inboxView === 'notes' ? 'primary' : 'secondary'}" data-action="inbox-mode" data-mode="notes" aria-pressed="${ui.inboxView === 'notes'}">Notas internas</button></div>`;
    return ui.inboxView === 'whatsapp' && real ? heading('Atendimentos', 'Conversas reais, com o próximo passo sempre à vista.', btn('Novo atendimento', 'new-conversation', 'plus', 'secondary')) + tabs + '<div id="whatsapp-root"></div>' : heading('Atendimentos', 'Organize as conversas e acompanhe o que ainda precisa de resposta.', btn('Sobre a integração', 'integrations', 'link', 'secondary') + btn('Novo atendimento', 'new-conversation', 'plus', 'primary')) + tabs + manualConversationsPage();
}
function manualConversationsPage() {
    const convs = state.conversations.filter(v => ui.convFilter === 'all' || (ui.convFilter === 'resolved' ? v.status === 'resolved' : ui.convFilter === 'open' ? v.status !== 'resolved' : v.category === ui.convFilter));
    const v = convs.find(v => v.id === ui.conversationId) || convs[0], c = v?.contact;
    const related = v ? [...state.quotes.filter(q => q.origin?.type === 'note' && q.origin.id === v.id).map(q => `<button class="task-row attention-button" data-action="edit-quote" data-id="${q.id}">${icon('file')}<span class="grow">Orçamento · ${esc(serviceLabel(q))}</span>${pill(QUOTE_STATUS[q.status], 'gray')}</button>`), ...state.tasks.filter(t => t.origin?.type === 'note' && t.origin.id === v.id).map(t => `<button class="task-row attention-button" data-action="edit-task" data-id="${t.id}">${icon('checklist')}<span class="grow">Tarefa · ${esc(t.title)}</span>${pill(t.done ? 'Concluída' : 'Pendente', t.done ? 'green' : 'orange')}</button>`)].join('') : '';
    const list = convs.map(x => `<button class="inbox-item ${v?.id === x.id ? 'active' : ''}" data-action="select-conversation" data-id="${x.id}">${avatar(x.contact)}<div class="grow"><div class="row between gap6"><span class="name">${esc(x.contact.name)}</span><small class="muted">${esc(x.time)}</small></div><p>${esc(x.messages.at(-1)?.text)}</p>${pill(x.status === 'resolved' ? 'Resolvida' : x.category, x.status === 'resolved' ? 'gray' : categoryColor(x.category))}</div></button>`).join('') || empty('Nenhuma conversa neste filtro.', 'Use Novo atendimento para registrar um pedido.', 'chat');
    const thread = v ? `<header class="thread-head row">${iconBtn('left', 'back-inbox', 'Voltar para conversas', 'style="display:none" class="icon-btn thread-back"')}${avatar(c)}<button data-action="edit-conversation" data-id="${v.id}" style="text-align:left" aria-label="Editar contato de ${esc(c.name)}"><h3>${esc(c.name)}</h3><small>${esc(c.phone || 'Sem telefone')} · ${esc(v.category)}</small></button><div class="thread-tools">${iconBtn('edit', 'classify', 'Alterar classificação', `data-id="${v.id}"`)}${iconBtn('close', 'v12-delete-confirm', 'Excluir esta conversa', `data-collection="conversations" data-id="${v.id}"`)}${btn(v.status === 'resolved' ? 'Reabrir' : 'Resolver', 'resolve-conversation', v.status === 'resolved' ? 'undo' : 'check', 'secondary sm', `data-id="${v.id}"`)}</div></header>${v.category === 'Segurança' && v.status !== 'resolved' ? `<div class="notice red" style="border-radius:0">${icon('warning')}Relato de segurança: avalie pessoalmente o contexto antes de orientar a cliente.</div>` : ''}<div class="row wrap gap8 conversation-links" style="padding:10px 18px">${btn('Criar orçamento', 'note-quote', 'file', 'secondary sm', `data-id="${v.id}"`)}${btn('Criar tarefa', 'note-task', 'checklist', 'secondary sm', `data-id="${v.id}"`)}${c.phone ? btn('Abrir no WhatsApp', 'wa-note', 'chat', 'secondary sm', `data-id="${v.id}"`) : ''}</div>${related ? `<div style="padding:0 18px 8px">${related}</div>` : ''}<div class="thread-body"><div class="thread-date">Histórico do atendimento</div>${v.messages.map(m => `<div class="bubble ${m.type === 'note' ? 'note' : ''}">${m.type === 'note' ? '<span class="eyebrow">Nota interna</span><br>' : ''}${esc(m.text)}<time>${esc(m.time)}</time></div>`).join('')}</div><div class="summary-box"><div class="row between wrap gap8"><strong>${icon('spark')}Resumo da conversa ${v.summaryAI ? pill('Sugerido pela IA', 'green') : ''}</strong>${btn(aiBusy === 'summary:' + v.id ? 'Resumindo…' : v.summaryAI ? 'Atualizar resumo' : 'Resumir com IA', 'ai-note-summary', 'spark', 'secondary sm', `data-id="${v.id}" ${aiBusy ? 'disabled' : ''}`)}</div><p>${esc(v.summary || 'Sem resumo ainda. A IA lê as notas desta conversa e resume o que a cliente pediu e o que falta responder.')}</p></div><div class="draft-box"><div class="row between wrap gap8"><h3>Rascunho para sua revisão</h3>${pill('Aprovação manual', 'orange')}</div>${v.draft ? `<p>${esc(v.draft)}</p>` : '<p class="muted small">Peça uma sugestão de resposta à IA: ela fica aqui para você revisar, editar e copiar.</p>'}<div class="row wrap gap8">${v.draft ? btn('Revisar e copiar', 'review-draft', 'edit', 'secondary sm', `data-id="${v.id}"`) : ''}${btn(aiBusy === 'reply:' + v.id ? 'Escrevendo…' : 'Sugerir resposta com IA', 'ai-note-reply', 'spark', 'secondary sm', `data-id="${v.id}" ${aiBusy ? 'disabled' : ''}`)}</div></div><form novalidate id="note-form" class="composer" data-form="note"><input type="hidden" name="id" value="${v.id}"><label class="field"><span>Registrar uma nota ou mensagem recebida</span><textarea class="resize-none" name="text" required maxlength="3000" placeholder="Contexto, observações, próximos passos ou o que a cliente escreveu..."></textarea></label><div class="composer-footer"><select name="type" aria-label="Tipo do registro"><option value="note">Nota interna</option><option value="incoming">Mensagem da cliente</option></select><span class="muted small grow">Nada é enviado pelo WhatsApp.</span><button class="btn primary" type="submit">${icon('plus')}Salvar</button></div></form>` : empty('Selecione uma conversa.', 'Ou registre um novo atendimento.', 'chat');
    return `<div class="card inbox ${ui.threadOpen ? 'mobile-thread' : ''}"><aside class="inbox-list"><div class="inbox-list-head"><div class="row between inbox-pending-count"><strong>Atendimentos pendentes</strong>${pill(pendingConvs().length, 'orange')}</div><select data-change="conv-filter" aria-label="Filtrar conversas">${[['all', 'Todas as conversas'], ['open', 'Pendentes'], ['Segurança', 'Segurança'], ['Orçamento', 'Orçamentos'], ['resolved', 'Resolvidas']].map(([val, t]) => `<option value="${val}" ${ui.convFilter === val ? 'selected' : ''}>${t}</option>`).join('')}</select></div>${list}</aside><section class="thread">${thread}</section></div>`;
}
function conversationForm(id) {
    const v = state.conversations.find(v => v.id === id);
    openForm(v ? 'Editar atendimento' : 'Novo atendimento', 'conversation', contactFields(v?.contact, { required: true }) + selectField('Categoria', 'category', AI_CATEGORIES.map(t => [t, t]), v?.category || 'Informações gerais', 'required') + selectField('Situação', 'status', [['open', 'Pendente'], ['waiting', 'Aguardando cliente'], ['resolved', 'Resolvida']], v?.status || 'open', 'required') + (v ? '' : textfield('O que a cliente pediu?', 'text', '', 'required maxlength="3000"')) + '<div class="notice full">Use para pedidos que chegaram por telefone, Instagram, pessoalmente ou outro canal. Nada é enviado à cliente.</div>', v ? 'Salvar alterações' : 'Registrar atendimento', id || '');
}

/* ---------- Contatos (sem cadastro de clientes) ---------- */
/** Campos de contato com sugestões das conversas e registros já existentes. */
function contactFields(contact, { required = true, label = 'Contato' } = {}) {
    const options = knownContacts(state, WHATSAPP_API && dataset === 'real' ? whatsapp.contacts() : []).map(c => `<option value="${esc(c.name)}" data-phone="${esc(c.phone)}">${esc(c.phone)}</option>`).join('');
    return `<label class="field"><span>${label}${required ? '' : ' (opcional)'}</span><input name="contactName" value="${esc(contact?.name || '')}" maxlength="100" list="contact-options" autocomplete="off" data-input="contact-name" ${required ? 'required' : ''} placeholder="Nome"></label><label class="field"><span>Telefone / WhatsApp (opcional)</span><input name="contactPhone" type="tel" inputmode="tel" value="${esc(contact?.phone || '')}" maxlength="30" placeholder="(41) 90000-0000"></label><datalist id="contact-options">${options}</datalist>`;
}
const formContact = (val, required) => { const c = makeContact(val('contactName'), val('contactPhone')), issue = contactIssue(c, { required }); if (issue) throw Error(issue); return c; };
/** Abre orçamento ou tarefa já ligado à conversa do WhatsApp. */
function createFromWhatsApp(kind, { name, phone, threadId, summary }) {
    const digits = phoneDigits(phone), contact = { name: name || 'Contato do WhatsApp', phone: digits.length >= 10 && digits.length <= 15 ? phone : '' }, origin = { type: 'whatsapp', id: threadId };
    if (kind === 'quote') quoteForm(null, { contact, origin, notes: summary || '' });
    else taskForm(null, { contact, origin, title: 'Responder ' + contact.name.split(' ')[0], area: 'Atendimento' });
}
function openOrigin(type, id) {
    if (type === 'whatsapp') {
        if (dataset !== 'real') { toast('As conversas do WhatsApp ficam nos dados reais.'); return; }
        ui.inboxView = 'whatsapp'; whatsapp.open(id);
    } else {
        if (!state.conversations.some(v => v.id === id)) { toast('A nota de origem não existe mais.'); return; }
        ui.inboxView = 'notes'; ui.convFilter = 'all'; ui.conversationId = id; ui.threadOpen = true;
    }
    go('conversations');
}

/* ---------- Orçamentos ---------- */
let quotePhotos = [];
function quotesPage() {
    const qs = state.quotes.filter(q => ui.quoteFilter === 'all' || (ui.quoteFilter === 'open' ? ['missing', 'review'].includes(q.status) : q.status === ui.quoteFilter)).sort((a, b) => b.date.localeCompare(a.date));
    return `${heading('Orçamentos', 'Reúna referências, confira informações e registre sua avaliação.', btn('Exportar', 'export-modal', 'download', 'secondary', 'data-kind="quotes"') + btn('Novo orçamento', 'new-quote', 'plus', 'primary'))}<div class="toolbar"><div class="segmented">${[['all', 'Todos'], ['open', 'Em andamento'], ['missing', 'Faltam informações'], ['review', 'Em avaliação'], ['approved', 'Avaliados'], ['closed', 'Encerrados']].map(([val, t]) => `<button data-action="quote-filter" data-id="${val}" class="${ui.quoteFilter === val ? 'active' : ''}">${t}</button>`).join('')}</div></div><div class="quote-grid">${qs.map(q => `<article class="card quote-card"><div class="row between">${avatar(q.contact)}${pill(QUOTE_STATUS[q.status], q.status === 'approved' ? 'green' : q.status === 'missing' ? 'orange' : 'gray')}</div><h3>${esc(contactName(q.contact))}</h3><p class="desc">${esc(serviceLabel(q))} · ${fmt(q.date)}</p>${q.contact?.phone || q.origin ? `<p class="table-sub">${contactLine(q.contact, q.origin)}</p>` : ''}<div class="quote-note">${esc(q.notes || 'Nenhuma observação registrada.')}</div>${q.photos.length ? `<p class="table-sub">${icon('image')}${q.photos.length} foto(s) associada(s)</p>` : ''}<footer><span class="quote-value">${q.value === null ? '<span class="muted small">Valor a definir</span>' : money(q.value)}</span>${btn('Avaliar', 'edit-quote', 'arrow', 'soft sm', `data-id="${q.id}"`)}</footer></article>`).join('') || empty('Nenhum orçamento neste filtro.', 'Crie uma solicitação para começar.', 'file')}</div><div class="notice section-gap">${icon('scissors')}A definição do procedimento e do preço é sempre sua. As fotos são organizadas sem análise visual por IA.</div>`;
}
function quoteForm(id, preset = {}) {
    const q = state.quotes.find(q => q.id === id), contact = q?.contact || preset.contact, origin = q ? q.origin : preset.origin || null;
    quotePhotos = [...(q?.photos || [])];
    const services = [['', q?.serviceName ? q.serviceName + ' (excluído do catálogo)' : 'A definir'], ...state.services.map(s => [s.id, s.name])];
    openForm(q ? 'Avaliar solicitação' : 'Novo orçamento', 'quote', `<input type="hidden" name="origin" value="${esc(origin ? JSON.stringify(origin) : '')}">` + contactFields(contact) + (origin ? `<div class="notice full">${icon('link')}${origin.type === 'whatsapp' ? 'Criado a partir de uma conversa do WhatsApp.' : 'Criado a partir de uma nota de atendimento.'} ${btn('Abrir conversa', 'open-origin', 'chat', 'text sm', `data-type="${esc(origin.type)}" data-id="${esc(origin.id)}"`)}</div>` : '') + selectField('Serviço solicitado', 'serviceId', services, q ? q.serviceId || '' : '', '') + selectField('Etapa da avaliação', 'status', Object.entries(QUOTE_STATUS), q?.status || 'review', 'required') + field('Valor definido por você (R$)', 'value', q?.value ?? '', 'number', 'min="0.01" max="100000" step="0.01"') + textfield('Contexto, histórico e informações ausentes', 'notes', q?.notes ?? preset.notes ?? '', 'maxlength="3000"') + textfield('Perguntas para enviar à cliente', 'question', q?.question || '', 'maxlength="3000"') + `<div class="full"><label class="field"><span>Fotos de referência</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-change="quote-photos"><small>Até 3 fotos, com no máximo 500 KB cada. Sem análise visual.</small></label><div class="photos" id="quote-photos">${photoMarkup()}</div></div>` + '<div class="notice full">Salvar registra sua avaliação. Nenhuma proposta ou pergunta é enviada sozinha: use “Perguntas pelo WhatsApp” para abrir a mensagem pronta.</div>', 'Salvar avaliação', id || '', true);
    if (q) addFooterDelete('quotes', id, 'Excluir orçamento');
    document.querySelector('dialog .dialog-footer').insertAdjacentHTML('afterbegin', btn('Copiar perguntas', 'copy-question', 'copy', 'secondary') + btn('Perguntas pelo WhatsApp', 'wa-quote', 'chat', 'secondary') + (q ? btn('Criar tarefa', 'quote-task', 'checklist', 'secondary', `data-id="${esc(id)}"`) : ''));
}
function photoMarkup() { return quotePhotos.map((p, i) => `<div class="photo"><img src="${esc(p)}" alt="Referência associada ao orçamento ${i + 1}"><button type="button" data-action="remove-photo" data-index="${i}" aria-label="Remover foto ${i + 1}">${icon('close')}</button></div>`).join(''); }

/* ---------- Tarefas ---------- */
function tasksPage() {
    const filter = ui.taskFilter, tasks = state.tasks.filter(t => filter === 'all' || (filter === 'done' ? t.done : filter === 'late' ? !t.done && t.due < localDate() : !t.done)).sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
    return `${heading('Tarefas', 'Veja os próximos passos, os prazos e o que já foi concluído.', btn('Exportar', 'export-modal', 'download', 'secondary', 'data-kind="tasks"') + btn('Nova tarefa', 'new-task', 'plus', 'primary'))}<div class="toolbar"><div class="segmented">${[['open', 'Pendentes'], ['late', 'Atrasadas'], ['done', 'Concluídas'], ['all', 'Todas']].map(([id, t]) => `<button data-action="task-filter" data-id="${id}" class="${filter === id ? 'active' : ''}">${t}</button>`).join('')}</div></div><div class="card priority-list">${tasks.map(t => { const q = t.quoteId && state.quotes.find(q => q.id === t.quoteId); return `<div class="task-row ${t.done ? 'done' : ''}"><button class="check ${t.done ? 'checked' : ''}" data-action="toggle-task" data-id="${t.id}" aria-label="${t.done ? 'Reabrir' : 'Concluir'} ${esc(t.title)}">${t.done ? icon('check') : ''}</button><div class="grow"><span class="task-title">${esc(t.title)}</span><div class="task-meta"><span>${esc(t.area)}</span><span>·</span><span>${t.due < localDate() && !t.done ? 'Atrasada · ' : ''}${fmt(t.due)}</span>${t.contact ? `<span>· ${esc(t.contact.name)}</span>` : ''}${q ? `<span>· ${btn('Orçamento', 'edit-quote', 'file', 'text sm', `data-id="${q.id}"`)}</span>` : ''}${t.origin ? `<span>· ${btn('Conversa', 'open-origin', 'chat', 'text sm', `data-type="${esc(t.origin.type)}" data-id="${esc(t.origin.id)}"`)}</span>` : ''}</div></div>${pill(t.priority, t.priority === 'Alta' ? 'red' : t.priority === 'Média' ? 'orange' : 'gray')}${iconBtn('edit', 'edit-task', 'Editar tarefa', `data-id="${t.id}"`)}</div>`; }).join('') || empty('Tudo cuidado por aqui.', 'Crie uma tarefa quando precisar de um lembrete.', 'checklist')}</div>`;
}
function taskForm(id, preset = {}) {
    const t = state.tasks.find(t => t.id === id), origin = t ? t.origin : preset.origin || null;
    const quotes = [['', 'Nenhum'], ...state.quotes.map(q => [q.id, `${contactName(q.contact)} · ${serviceLabel(q)} · ${QUOTE_STATUS[q.status]}`])];
    openForm(t ? 'Cuidar desta tarefa' : 'Uma nova tarefa', 'task', `<input type="hidden" name="origin" value="${esc(origin ? JSON.stringify(origin) : '')}">` + field('O que precisa ser feito?', 'title', t?.title || preset.title || '', 'text', 'required maxlength="180"', true) + selectField('Área', 'area', TASK_AREAS.map(a => [a, a]), t?.area || preset.area || 'Atendimento', 'required') + selectField('Prioridade', 'priority', PRIORITIES.map(p => [p, p]), t?.priority || 'Média', 'required') + field('Prazo', 'due', t?.due || localDate(), 'date', 'required') + selectField('Orçamento relacionado', 'quoteId', quotes, t?.quoteId || preset.quoteId || '', '') + contactFields(t ? t.contact : preset.contact, { required: false, label: 'Contato relacionado' }) + (origin ? `<div class="notice full">${icon('link')}Ligada a uma conversa. ${btn('Abrir conversa', 'open-origin', 'chat', 'text sm', `data-type="${esc(origin.type)}" data-id="${esc(origin.id)}"`)}</div>` : ''), 'Salvar tarefa', id || '');
    if (t) addFooterDelete('tasks', id, 'Excluir tarefa');
}

/* ---------- Serviços (catálogo) ---------- */
function servicesPage() {
    return `${heading('Serviços', 'Catálogo com descrição, duração e orientações para as clientes.', btn('Exportar', 'export-modal', 'download', 'secondary', 'data-kind="services"') + btn('Novo serviço', 'new-service', 'plus', 'primary'))}<div class="service-grid">${state.services.map((s, i) => `<article class="card service-card"><span class="service-icon">${icon(['scissors', 'spark', 'sun', 'leaf', 'heart'][i % 5])}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><div class="meta"><span>${icon('clock')} ${s.duration} min</span><span>${plural(state.quotes.filter(q => q.serviceId === s.id).length, 'orçamento', 'orçamentos')}</span></div><footer><span class="muted tiny">${esc(s.products || 'Produtos não informados')}</span>${btn('Ver detalhes', 'edit-service', 'arrow', 'text', `data-id="${s.id}"`)}</footer></article>`).join('') || empty('Nenhum serviço no catálogo.', 'Cadastre os serviços que você oferece.', 'scissors')}</div>`;
}
function serviceForm(id) {
    const s = state.services.find(s => s.id === id);
    openForm(s ? 'Detalhes do serviço' : 'Novo serviço', 'service', field('Nome do serviço', 'name', s?.name || '', 'text', 'required maxlength="120"', true) + textfield('Descrição', 'description', s?.description || '', 'required maxlength="2000"') + field('Duração média (min)', 'duration', s?.duration || 60, 'number', 'required min="5" max="600" step="5"', true) + textfield('Produtos utilizados', 'products', s?.products || '', 'maxlength="2000"') + textfield('Orientações antes do procedimento', 'before', s?.before || '', 'maxlength="2000"') + textfield('Orientações depois do procedimento', 'after', s?.after || '', 'maxlength="2000"'), 'Salvar serviço', id || '', true);
    if (s) addFooterDelete('services', id, 'Excluir serviço');
}

/* ---------- Estoque ---------- */
const stockNumber = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
function moneyPrecise(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 }); }
function table(headers, rows, message) {
    const target = currentDestination(), paging = recordPage(rows, ui.inventoryPageIndex);
    ui.inventoryPageIndex = paging.page;
    const markup = paging.rows.join('');
    return `<div class="table-wrap"><table class="data-table" aria-label="Registros de estoque"><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${markup}</tbody></table>${markup ? '' : empty(message || 'Nenhum registro.', 'Revise os filtros selecionados.')}</div>${paging.pages > 1 ? `<nav class="records-pagination" aria-label="Páginas dos registros"><span role="status">${paging.start}–${paging.end} de ${paging.total} registros</span><div class="row gap8">${paging.page > 1 ? destinationLink('Anterior', { ...target, p: paging.page - 1 }, 'btn secondary sm') : '<button type="button" class="btn secondary sm" disabled>Anterior</button>'}<span aria-current="page">${paging.page} / ${paging.pages}</span>${paging.page < paging.pages ? destinationLink('Próxima', { ...target, p: paging.page + 1 }, 'btn secondary sm') : '<button type="button" class="btn secondary sm" disabled>Próxima</button>'}</div></nav>` : ''}`;
}
function inventoryPage() {
    const missingCost = state.products.filter(p => stockOf(state, p.id).quantity > 0 && stockOf(state, p.id).unitCost === null).length, low = lowStock().length;
    const products = state.products.filter(p => { const st = stockOf(state, p.id); return ui.inventoryScope === 'low' ? st.quantity <= p.minimum : ui.inventoryScope === 'unknown' ? st.quantity > 0 && st.unitCost === null : true; });
    const value = state.products.reduce((sum, p) => { const st = stockOf(state, p.id); return st.unitCost === null ? sum : sum + cents(st.quantity * st.unitCost); }, 0);
    const scope = { low: 'Produtos com estoque baixo', unknown: 'Produtos com custo a conferir' }[ui.inventoryScope];
    const body = ui.inventoryTab === 'products'
        ? table(['Produto', 'Saldo', 'Custo por unidade', 'Estoque mínimo', ''], products.map(p => { const st = stockOf(state, p.id), target = { page: 'inventory', product: p.id }; return `<tr><td>${destinationLink(esc(p.name), target, 'name-link')}<p class="table-sub">${esc(p.brand || 'Sem marca informada')} · embalagem ${stockNumber(p.packageSize)} ${p.unit}</p></td><td>${destinationLink(stockNumber(st.quantity) + ' ' + p.unit, target, 'money-link')}${st.quantity <= p.minimum ? `<p class="table-sub">${pill('Repor', 'orange')}</p>` : ''}</td><td>${st.unitCost === null ? pill('Custo a conferir', 'orange') : moneyPrecise(st.unitCost) + ' / ' + p.unit}</td><td>${stockNumber(p.minimum)} ${p.unit}</td><td>${btn('Uso', 'stock-use', 'leaf', 'soft sm', `data-id="${p.id}"`)}${destinationLink('Detalhes ' + icon('arrow'), target, 'btn text')}</td></tr>`; }), 'Nenhum produto corresponde a esta consulta.')
        : table(['Data', 'Produto', 'Movimento', 'Quantidade', 'Custo registrado', ''], [...state.movements].reverse().map(m => { const p = state.products.find(p => p.id === m.productId); return `<tr><td>${fmt(m.date)}</td><td>${destinationLink(esc(p.name), { page: 'inventory', product: p.id }, 'name-link')}</td><td>${MOVEMENT_TYPES[m.type]}<p class="table-sub">${esc(m.note || '')}</p></td><td>${m.type === 'valuation' ? '—' : stockNumber(m.quantity) + ' ' + p.unit}</td><td>${m.unitCost === null ? 'A conferir' : moneyPrecise(m.unitCost) + ' / ' + p.unit}</td><td>${iconBtn('edit', 'edit-movement', 'Editar ou excluir movimento', `data-id="${esc(m.id)}"`)}</td></tr>`; }), 'Nenhuma movimentação registrada.');
    return `${heading('Estoque', 'Saldo dos produtos, entradas e saídas lançadas por você.', btn('Registrar uso', 'stock-use', 'leaf', 'secondary') + btn('Registrar entrada', 'stock-purchase', 'plus', 'secondary') + btn('Cadastrar produto', 'new-product', 'plus', 'primary'))}<div class="stats inventory-stats">${stat('Produtos cadastrados', state.products.length, `Valor em estoque: ${money(amount(value))} (custos conhecidos)`, 'leaf', { page: 'inventory', tab: 'products' })}${stat('Estoque baixo', low, 'Saldo igual ou abaixo do mínimo', 'warning', { page: 'inventory', tab: 'products', scope: 'low' })}${stat('Custos a conferir', missingCost, 'Produtos com saldo e custo desconhecido', 'file', { page: 'inventory', tab: 'products', scope: 'unknown' })}</div><div class="toolbar"><div class="segmented">${[['products', 'Produtos'], ['movements', 'Movimentações']].map(([id, label]) => `<button data-action="stock-tab" data-id="${id}" aria-pressed="${ui.inventoryTab === id}" class="${ui.inventoryTab === id ? 'active' : ''}">${label}</button>`).join('')}</div>${btn('Exportar estoque', 'export-modal', 'download', 'secondary', 'data-kind="stock"')}</div><section class="card">${scope ? `<div class="consultation-banner"><span>${scope}</span>${destinationLink('Ver todos', { page: 'inventory', tab: ui.inventoryTab }, 'btn text')}</div>` : ''}${body}</section><div class="notice section-gap">${icon('shield')}Entradas, usos e perdas são lançados por você. O custo médio é recalculado a cada entrada; a saída guarda o custo do momento.</div>`;
}
function productForm(id) {
    const p = state.products.find(p => p.id === id);
    if (p) {
        openForm('Editar produto', 'product', field('Produto / tonalidade', 'name', p.name, 'text', 'required maxlength="120"', true) + field('Marca (opcional)', 'brand', p.brand || '', 'text', 'maxlength="80"', true) + field(`Tamanho de uma embalagem (${p.unit})`, 'packageSize', p.packageSize, 'number', 'required min="0.001" max="1000000" step="0.001"') + field(`Estoque mínimo para aviso (${p.unit})`, 'minimum', p.minimum, 'number', 'required min="0" max="1000000" step="0.001"') + `<div class="notice full">A unidade (${p.unit}) não pode ser trocada, porque todo o histórico foi medido nela. Para corrigir quantidades, edite o movimento de estoque.</div>`, 'Salvar correção', id);
        addFooterDelete('products', id, 'Excluir produto');
        return;
    }
    openForm('Cadastrar produto e saldo inicial', 'product', field('Produto / tonalidade', 'name', '', 'text', 'required maxlength="120"', true) + field('Marca (opcional)', 'brand', '', 'text', 'maxlength="80"', true) + selectField('Unidade de controle', 'unit', [['g', 'Gramas (g)'], ['ml', 'Mililitros (ml)'], ['un', 'Unidades (un)']], 'g', 'required') + field('Tamanho de uma embalagem', 'packageSize', '', 'number', 'required min="0.001" max="1000000" step="0.001"') + field('Preço de uma embalagem (R$, opcional)', 'packageCost', '', 'number', 'min="0.01" max="100000" step="0.01"') + field('Quantidade que você tem hoje', 'quantity', 0, 'number', 'required min="0" max="1000000" step="0.001"') + field('Estoque mínimo para aviso', 'minimum', 0, 'number', 'required min="0" max="1000000" step="0.001"') + field('Data da contagem', 'date', localDate(), 'date', `required max="${localDate()}"`) + '<div class="notice full">Informe quantidade e embalagem na mesma unidade. Exemplo: embalagem de 1.000 ml com 350 ml restantes. Preço desconhecido fica em branco.</div>', 'Cadastrar produto', '', true);
}
function productDetail(id) {
    const p = state.products.find(p => p.id === id);
    if (!p) return;
    const s = stockOf(state, id);
    modal(p.name, `<div class="dialog-body"><p class="muted small">${esc(p.brand || 'Sem marca')} · embalagem ${stockNumber(p.packageSize)} ${p.unit} · mínimo ${stockNumber(p.minimum)} ${p.unit}</p><div class="detail-metrics two section-gap"><div><span>Disponível</span><strong>${stockNumber(s.quantity)} ${p.unit}</strong></div><div><span>Custo médio atual</span><strong>${s.unitCost === null ? 'A conferir' : moneyPrecise(s.unitCost)}</strong><small>por ${p.unit}</small></div></div><h3 class="section-gap">Últimos movimentos</h3>${state.movements.filter(m => m.productId === id).slice(-8).reverse().map(m => `<div class="audit-row">${fmt(m.date)} · ${MOVEMENT_TYPES[m.type]}<time>${m.type === 'valuation' ? moneyPrecise(m.unitCost) + ' / ' + p.unit : stockNumber(m.quantity) + ' ' + p.unit}${m.note ? ' · ' + esc(m.note) : ''}</time>${iconBtn('edit', 'edit-movement', 'Editar ou excluir este movimento', `data-id="${esc(m.id)}"`)}</div>`).join('') || empty('Sem movimentos.')}</div>`, `<span class="footer-delete">${deleteBtn('products', id, 'Excluir produto')}</span>` + btn('Editar produto', 'edit-product', 'edit', 'secondary', `data-id="${id}"`) + btn('Perda', 'stock-loss', 'warning', 'secondary', `data-id="${id}"`) + btn('Conferir custo', 'stock-value', 'edit', 'secondary', `data-id="${id}"`) + btn('Uso', 'stock-use', 'leaf', 'secondary', `data-id="${id}"`) + btn('Entrada', 'stock-purchase', 'plus', 'primary', `data-id="${id}"`), true);
}
/** Formulário único para entrada (compra), uso, perda e conferência de custo. */
function movementForm(type, productId) {
    if (!state.products.length) { productForm(); return; }
    const titles = { purchase: 'Registrar entrada no estoque', use: 'Registrar uso de produto', loss: 'Registrar perda de produto', valuation: 'Conferir custo do estoque' };
    const options = state.products.map(p => [p.id, `${p.name} · saldo ${stockNumber(stockOf(state, p.id).quantity)} ${p.unit}`]);
    let body = `<input type="hidden" name="type" value="${type}">` + selectField('Produto', 'productId', options, productId || state.products[0].id, 'required', true);
    if (type === 'purchase') body += field('Quantidade que entrou (na unidade do produto)', 'quantity', '', 'number', 'required min="0.001" max="1000000" step="0.001"') + field('Valor total pago (R$, opcional)', 'total', '', 'number', 'min="0.01" max="100000" step="0.01"');
    if (type === 'use' || type === 'loss') body += field(type === 'use' ? 'Quantidade usada' : 'Quantidade perdida', 'quantity', '', 'number', 'required min="0.001" max="1000000" step="0.001"', true);
    if (type === 'valuation') body += field('Preço de uma embalagem hoje (R$)', 'packageCost', '', 'number', 'required min="0.01" max="100000" step="0.01"', true);
    body += field('Data', 'date', localDate(), 'date', `required max="${localDate()}"`, true) + textfield(type === 'use' ? 'Onde foi usado? (opcional)' : 'Observação (opcional)', 'note', '', 'maxlength="500"') + `<div class="notice full">${{ purchase: 'A entrada soma ao saldo e atualiza o custo médio. Não gera despesa: esta versão não tem financeiro.', use: 'O uso reduz o saldo e guarda o custo médio do momento.', loss: 'A perda reduz o saldo e fica no histórico.', valuation: 'O custo informado vale para o estoque atual a partir desta data.' }[type]}</div>`;
    openForm(titles[type], 'movement', body, 'Confirmar');
}
function movementEditForm(id) {
    const m = state.movements.find(m => m.id === id), p = m && state.products.find(p => p.id === m.productId);
    if (!m || !p) return;
    let body = `<div class="notice full">${esc(p.name)} · ${MOVEMENT_TYPES[m.type]} em ${fmt(m.date)}</div>`;
    if (m.type !== 'valuation') body += field(`Quantidade (${p.unit})`, 'quantity', Math.abs(m.quantity), 'number', `${m.type === 'opening' ? 'min="0"' : 'min="0.001"'} required max="1000000" step="0.001"`);
    if (m.type === 'purchase') body += field('Valor total pago (R$, opcional)', 'total', m.unitCost === null ? '' : Math.round(m.quantity * m.unitCost * 100) / 100, 'number', 'min="0.01" max="100000" step="0.01"');
    if (m.type === 'opening') body += field(`Custo por ${p.unit} (R$, vazio se desconhecido)`, 'unitCost', m.unitCost ?? '', 'number', 'min="0" max="100000" step="0.000001"');
    if (m.type === 'valuation') body += field(`Custo por ${p.unit} (R$)`, 'unitCost', m.unitCost ?? '', 'number', 'required min="0.000001" max="100000" step="0.000001"');
    body += field('Data', 'date', m.date, 'date', `required max="${localDate()}"`) + textfield('Observação', 'note', m.note || '', 'maxlength="500"') + '<div class="notice full">O saldo e o custo médio das saídas seguintes são recalculados.</div>';
    openForm('Editar movimento de estoque', 'edit-movement', body, 'Salvar correção', id);
    addFooterDelete('movements', id);
}

/* ---------- Configurações ---------- */
function settingsPage() {
    return `${heading('Configurações', 'Aparência, conta, salões e conexões.')}<div class="toolbar">${btn('Exportar dados', 'export-modal', 'download', 'secondary')}${btn('Cópia completa JSON', 'backup', 'download', 'secondary')}${dataset === 'real' && baseIsEmpty() ? btn('Restaurar cópia JSON', 'v14-restore', 'upload', 'secondary') : ''}${btn(dataset === 'example' ? 'Voltar aos dados reais' : 'Ver demonstração', 'v3-dataset', 'spark', 'text', `data-dataset="${dataset === 'example' ? 'real' : 'example'}"`)}</div><section class="card appearance-card"><div><span class="eyebrow">Deixe confortável para você</span><h2>Aparência</h2><p>Escolha entre claro e escuro suave. Sua escolha fica salva neste dispositivo.</p></div>${themeControl()}</section><div class="settings-grid"><section class="card settings-card"><h2>Seu ateliê</h2><form novalidate data-form="settings"><div class="form-grid">${field('Como prefere ser chamada?', 'name', state.settings.name, 'text', 'required maxlength="50"', true)}${field('Prazo de resposta de referência (min)', 'responseMinutes', state.settings.responseMinutes ?? 60, 'number', 'required min="5" max="1440"', true)}<div id="settings-error" role="alert" class="full small" style="color:var(--red)"></div><div class="full"><button type="submit" class="btn primary">Salvar</button></div></div></form></section><section class="card settings-card" id="conta"><h2>Sua conta</h2><div class="setting-row account-row"><div><strong>${esc(accountEmail || 'Sua conta')}</strong><p>${accountRole === 'admin' ? 'Titular. ' : ''}Entrada com e-mail e senha. Trocar a senha encerra o acesso nos outros aparelhos.</p></div><div class="row wrap gap8">${btn('Trocar e-mail', 'change-email', 'edit', 'secondary sm')}${btn('Trocar senha', 'change-password', 'lock', 'secondary sm')}<a class="btn secondary sm" href="/login" data-salon-logout>${icon('arrow')}Sair da conta</a></div></div></section>${salonsSection()}<section class="card settings-card"><h2>Conexões e acesso</h2><div class="setting-row"><div><strong>Dados persistentes</strong><p>Registros vinculados à conta autenticada, com conferência de versão para alterações simultâneas.</p></div>${pill(syncStatus === 'saved' ? 'Sincronizado' : 'Conferir', syncStatus === 'saved' ? 'green' : 'orange')}</div><div class="setting-row"><div><strong>WhatsApp Business</strong><p>O conector Baileys permite vincular por QR Code e receber e enviar textos, imagens e áudios. Requer o computador do ateliê ligado. Confira a conexão em Atendimentos → WhatsApp.</p></div>${btn('Configurar', 'integrations', 'link', 'secondary sm')}</div><div class="setting-row"><div><strong>Inteligência artificial</strong><p>${aiStatus?.enabled ? `Classificação automática das conversas do WhatsApp, resumo e sugestão de resposta (Workers AI). Hoje: ${aiStatus.usage?.classify || 0} classificações, ${(aiStatus.usage?.summary || 0) + (aiStatus.usage?.reply || 0)} resumos/respostas. A IA só sugere; nada é enviado sem você.` : 'Classificação, resumo e sugestão de resposta com o Workers AI (gratuito até a cota diária). No computador, ligue com CONFIGURAR-IA.cmd; na nuvem, já vem ativa.'}</p></div>${pill(aiStatus?.enabled ? 'Ativa' : aiStatus ? 'Desligada' : 'Verificando', aiStatus?.enabled ? 'green' : 'gray')}</div></section><section class="card settings-card full"><h2>Histórico de ações confirmadas</h2><p class="small muted">As alterações salvas ficam registradas no servidor. Última sincronização: ${lastSavedAt ? new Date(lastSavedAt).toLocaleString('pt-BR') : 'nenhuma alteração ainda'}.</p>${state.audit.slice(0, 8).map(a => `<div class="audit-row">${esc(a.action)}<time>${new Date(a.at).toLocaleString('pt-BR')} · ${esc(a.by)}</time></div>`).join('') || empty('O histórico começa com sua primeira alteração.')}${state.audit.length ? btn('Histórico completo', 'audit', 'arrow', 'text') : ''}</section></div>`;
}
function renderPage() { return ({ dashboard, conversations: conversationsPage, quotes: quotesPage, services: servicesPage, inventory: inventoryPage, tasks: tasksPage, settings: settingsPage }[ui.page] || dashboard)(); }
function help() {
    modal('Uma rotina mais simples', `<div class="dialog-body skeleton-help"><p class="notice">${dataset === 'example' ? 'Você está na base de exemplos, separada dos dados reais.' : 'Os registros pertencem à sua conta. Confira o indicador de sincronização antes de sair.'}</p><div class="help-list section-gap"><div><strong>1. Conecte o WhatsApp</strong>Em Atendimentos → WhatsApp, instale o conector no computador do ateliê e leia o QR Code. Pedidos de outros canais entram como notas internas.</div><div><strong>2. Responda com calma</strong>A IA classifica, resume e sugere respostas. Você revisa e envia.</div><div><strong>3. Transforme em orçamento ou tarefa</strong>Na conversa, toque em Criar orçamento ou Criar tarefa: o contato e o vínculo com a conversa já vêm preenchidos.</div><div><strong>4. Cuide do estoque</strong>Cadastre os produtos com o saldo atual e lance entradas, usos e perdas quando acontecerem.</div><div><strong>5. Mantenha o catálogo</strong>Serviços com descrição, duração e orientações ajudam nas respostas e nos orçamentos.</div></div><p class="notice section-gap">Cada tela traz “Como usar esta tela”, com explicações sobre suas ações.</p></div>`);
}

/* ---------- Janelas e campos ---------- */
function modal(title, body, footer = '', wide = false) {
    const active = document.activeElement;
    if (active && !active.closest?.('dialog')) modalOpener = active;
    document.getElementById('overlay-root').innerHTML = `<dialog id="dialog" class="${wide ? 'wide' : ''}" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${iconBtn('close', 'close-modal', 'Fechar janela')}</div>${body}${footer ? `<div class="dialog-footer">${footer}</div>` : ''}</dialog>`;
    const d = document.getElementById('dialog');
    d.showModal();
    d.addEventListener('cancel', e => { e.preventDefault(); closeModal(); });
    d.addEventListener('click', e => {
        if (e.target === d && !(e.clientX >= d.getBoundingClientRect().left && e.clientX <= d.getBoundingClientRect().right && e.clientY >= d.getBoundingClientRect().top && e.clientY <= d.getBoundingClientRect().bottom))
            closeModal();
    });
}
/**
 * closeModal — Fecha o diálogo e limpa a área de sobreposição.
 */
function closeModal(force = false) {
    if (document.querySelector?.('#dialog form')?.dataset.busy && !force) { toast('Aguarde a configuração terminar.'); return; }
    if (leaveConfirmation && !force) { restoreEditing(); return; }
    const dirty = document.querySelector?.('#dialog form')?.dataset.dirty === 'true';
    if (dirty && !force) { confirmLeaving('Há alterações ainda não salvas. Deseja descartá-las?', () => closeModal(true)); return; }
    document.getElementById('dialog')?.close();
    document.getElementById('overlay-root').innerHTML = '';
    if (currentDetailTarget && !force) globalThis.history?.replaceState?.({ hanneUI: structuredClone(ui), target: currentDestination() }, '', destinationHref(currentDestination()));
    currentDetailTarget = null;
    if (!force) {
        const matchingLink = modalReturnHref && [...document.querySelectorAll('a[href]')].find(a => a.getAttribute('href') === modalReturnHref);
        const focus = matchingLink || (modalOpener?.isConnected ? modalOpener : document.querySelector?.('#main h1'));
        if (focus?.tagName === 'H1') focus.setAttribute('tabindex', '-1');
        focus?.focus?.({ preventScroll: true });
        modalReturnHref = null;
    }
}

/** Confirmação do aplicativo preserva o nó original do formulário para continuar editando sem perda. */
function confirmLeaving(message, proceed) {
    const previous = document.getElementById('dialog'), focus = document.activeElement;
    previous?.close(); previous?.remove();
    modal('Descartar alterações não salvas?', `<div class="dialog-body"><p>${esc(message)}</p></div>`, btn('Continuar editando', 'v7-keep-editing', '', 'secondary') + btn('Descartar e continuar', 'v7-discard', '', 'danger'));
    leaveConfirmation = { previous, focus, proceed };
    document.querySelector?.('[data-action="v7-keep-editing"]')?.focus();
}

/** Restaura inclusive valores e eventos do formulário que estava aberto antes da confirmação. */
function restoreEditing() {
    const pending = leaveConfirmation;
    leaveConfirmation = null;
    document.getElementById('dialog')?.close();
    const root = document.getElementById('overlay-root'); root.innerHTML = '';
    if (pending?.previous) { root.append(pending.previous); pending.previous.showModal(); pending.focus?.focus?.(); }
}
/**
 * openForm — Monta e abre um formulário padronizado com corpo, identificador, mensagens de erro e ações de salvar ou cancelar.
 */
function openForm(title, kind, body, save = 'Salvar', id = '', wide = false) { modal(title, `<form novalidate data-form="${kind}"><input type="hidden" name="id" value="${esc(id)}"><div class="dialog-body"><div class="form-grid">${body}</div></div><div class="form-error" id="form-error" role="alert"></div><div class="dialog-footer">${btn('Cancelar', 'close-modal')}<button class="btn primary" type="submit">${icon('check')}${save}</button></div></form>`, '', wide); }
/** Mantém as restrições HTML sem balões do navegador, com erro associado e foco no campo. */

/**
 * field — Monta o campo de formulário com rótulo e indicação opcional.
 */
function field(label, name, value = '', type = 'text', extra = '', full = false) { return `<label class="field ${full ? 'full' : ''}"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`; }
/**
 * textfield — Monta um campo de texto de várias linhas com conteúdo escapado.
 */
function textfield(label, name, value = '', extra = '', full = true) { return `<label class="field ${full ? 'full' : ''}"><span>${label}</span><textarea class="resize-none" name="${name}" ${extra}>${esc(value)}</textarea></label>`; }
/**
 * selectField — Monta seleção com rótulo e opções fornecidas pelo chamador.
 */
function selectField(label, name, options, value, extra = '', full = false) { return `<label class="field ${full ? 'full' : ''}"><span>${label}</span><select name="${name}" ${extra}>${options.map(([id, text]) => `<option value="${esc(id)}" ${String(id) === String(value) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`; }
/**
 * clientOptions — Monta pares de identificador e nome das clientes para os seletores; identifica cadastros temporários.
 */
const deleteBtn = (collection, id, label = 'Excluir') => btn(label, 'v12-delete-confirm', 'close', 'danger', `data-collection="${collection}" data-id="${esc(id)}"`);
function addFooterDelete(collection, id, label) { const footer = document.querySelector('#dialog .dialog-footer'); if (footer && id) footer.insertAdjacentHTML('afterbegin', `<span class="footer-delete">${deleteBtn(collection, id, label)}</span>`); }
function reviewDraft(id) {
    const v = state.conversations.find(v => v.id === id);
    if (!v) return;
    openForm('Revisar rascunho', 'draft', textfield('Edite e confira antes de copiar', 'text', v.draft || '', 'required maxlength="4000"') + '<div class="notice full">Copiar prepara o texto revisado para envio manual. Confira a orientação e a destinatária antes de enviar.</div>', 'Confirmar e copiar', id);
    if (v.contact.phone) document.querySelector('#dialog .dialog-footer')?.insertAdjacentHTML('afterbegin', btn('Abrir no WhatsApp', 'wa-draft', 'chat', 'secondary', `data-id="${esc(id)}"`));
}
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        (document.getElementById('dialog') || document.body).appendChild(ta);
        ta.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        }
        catch { }
        ta.remove();
        return ok;
    }
}
/**
 * waComposer — Mensagem editável e link para abrir a conversa da cliente no WhatsApp.
 * Abre por cima do formulário atual (sem perder o que foi digitado). Nada é enviado pelo sistema:
 * o envio acontece no WhatsApp, e as respostas chegam lá, pelas notificações do celular.
 */
/** Envio manual pelo link wa.me: a profissional revisa o texto e envia no próprio WhatsApp. */
function waComposer(contact, text, { title = 'Enviar pelo WhatsApp', context = '' } = {}) {
    if (!contact?.name) { toast('Informe o contato antes de enviar pelo WhatsApp.'); return; }
    waClose();
    const d = document.createElement('dialog');
    d.id = 'wa-dialog'; d.className = 'wa-dialog'; d.setAttribute('aria-labelledby', 'wa-title');
    d.innerHTML = `<div class="dialog-head"><h2 id="wa-title">${esc(title)}</h2>${iconBtn('close', 'wa-close', 'Fechar janela')}</div><div class="dialog-body"><div class="row wa-recipient">${avatar(contact)}<div><h3>${esc(contact.name)}</h3>${context ? `<p class="muted small">${esc(context)}</p>` : ''}</div></div><div class="form-grid"><label class="field full"><span>Telefone do WhatsApp</span><input name="waPhone" type="tel" inputmode="tel" maxlength="30" autocomplete="off" value="${esc(contact.phone || '')}" data-input="wa-compose"><small class="wa-phone-hint" aria-live="polite"></small></label><label class="field full"><span>Mensagem (edite antes de abrir o WhatsApp)</span><textarea name="waText" maxlength="4000" rows="8" data-input="wa-compose">${esc(text)}</textarea></label></div><p class="notice">O WhatsApp abre com este texto pronto. Confira e toque em enviar por lá.</p></div><div class="dialog-footer">${btn('Copiar texto', 'wa-copy', 'copy', 'secondary')}<a class="btn primary" data-action="wa-open" href="#" target="_blank" rel="noopener noreferrer">${icon('chat')}Abrir no WhatsApp</a></div>`;
    document.body.append(d);
    d.addEventListener('cancel', e => { e.preventDefault(); waClose(); });
    d.showModal();
    waUpdate();
    const area = d.querySelector('[name="waText"]');
    area.focus(); area.setSelectionRange(area.value.length, area.value.length);
}
function waUpdate() {
    const d = document.getElementById('wa-dialog');
    if (!d) return;
    const phone = d.querySelector('[name="waPhone"]').value, text = d.querySelector('[name="waText"]').value, link = d.querySelector('[data-action="wa-open"]'), url = text.trim() ? waURL(phone, text) : '';
    link.href = url || '#';
    if (url) link.removeAttribute('aria-disabled'); else link.setAttribute('aria-disabled', 'true');
    const number = waPhone(phone), hint = d.querySelector('.wa-phone-hint');
    hint.textContent = number ? `Abrirá a conversa com +${number}.` : 'Confira o telefone, com DDD, para abrir o WhatsApp.';
    hint.classList.toggle('error', !number);
}
function waClose() { const d = document.getElementById('wa-dialog'); d?.close(); d?.remove(); }
document.addEventListener('input', e => { if (e.target.dataset?.input === 'wa-compose') waUpdate(); });
document.addEventListener('click', async e => {
    const t = e.target.closest?.('[data-action^="wa-"]');
    if (!t || !document.getElementById('wa-dialog')?.contains(t)) return;
    const a = t.dataset.action;
    if (a === 'wa-close') waClose();
    if (a === 'wa-copy') toast(await copyText(document.querySelector('#wa-dialog [name="waText"]').value) ? 'Texto copiado.' : 'Não foi possível copiar. Selecione o texto manualmente.');
    if (a === 'wa-open') { if (t.getAttribute('aria-disabled') === 'true') { e.preventDefault(); toast('Confira o telefone e a mensagem.'); } else setTimeout(waClose, 300); }
});

/* ---------- Alertas, busca e exportação ---------- */
function alerts() {
    const urgent = urgentConvs(), late = lateTasks(), low = lowStock();
    modal('O que merece atenção', `<div class="dialog-body">${urgent.map(v => `<button class="search-result" data-action="open-conversation" data-id="${v.id}">${icon(v.category === 'Segurança' ? 'warning' : 'chat')}<div><span>${esc(v.contact.name)}</span><small>${esc(v.category)} · ${esc(v.summary)}</small></div>${icon('arrow')}</button>`).join('')}${late.map(t => `<button class="search-result" data-action="edit-task" data-id="${t.id}">${icon('clock')}<div><span>${esc(t.title)}</span><small>Tarefa atrasada · ${fmt(t.due)}</small></div>${icon('arrow')}</button>`).join('')}${low.map(lowStockRow).join('')}${urgent.length || late.length || low.length ? '' : empty('Nenhum alerta prioritário.', 'Siga cuidando do seu dia.')}<div class="notice section-gap">Alertas aparecem apenas com o sistema aberto. Notificações fora do aplicativo ainda não estão ativas.</div></div>`, btn('Ver tarefas', 'nav', 'arrow', 'primary', 'data-page="tasks"'), true);
}
function searchModal() { modal('Encontre no seu ateliê', `<div class="dialog-body"><label class="field"><span>Contatos, orçamentos, tarefas, serviços e produtos</span><input id="global-search" class="search-input" type="search" placeholder="Digite um nome, serviço ou assunto..." data-input="global-search" autocomplete="off"></label><div id="search-results" class="search-results section-gap">${searchResults('')}</div></div>`); }
function searchResults(query) {
    const q = query.toLocaleLowerCase('pt-BR'), has = (...v) => v.join(' ').toLocaleLowerCase('pt-BR').includes(q), results = [];
    for (const v of state.conversations) if (q && has(v.contact.name, v.contact.phone, v.summary, v.category)) results.push({ ic: 'chat', title: v.contact.name, sub: 'Atendimento · ' + v.category, action: 'open-conversation', id: v.id });
    for (const x of state.quotes) if (q && has(contactName(x.contact), x.contact?.phone, serviceLabel(x), x.notes)) results.push({ ic: 'file', title: contactName(x.contact), sub: 'Orçamento · ' + serviceLabel(x), action: 'edit-quote', id: x.id });
    for (const t of state.tasks) if (q && has(t.title, t.contact?.name)) results.push({ ic: 'checklist', title: t.title, sub: 'Tarefa · ' + fmt(t.due), action: 'edit-task', id: t.id });
    for (const s of state.services) if (has(s.name)) results.push({ ic: 'scissors', title: s.name, sub: 'Serviço · ' + s.duration + ' min', action: 'edit-service', id: s.id });
    for (const p of state.products) if (q && has(p.name, p.brand)) results.push({ ic: 'leaf', title: p.name, sub: 'Produto · ' + stockNumber(stockOf(state, p.id).quantity) + ' ' + p.unit, action: 'product-detail', id: p.id });
    return results.slice(0, 12).map(r => `<button class="search-result" data-action="${r.action}" data-id="${r.id}">${icon(r.ic)}<div class="grow"><span>${esc(r.title)}</span><small>${esc(r.sub)}</small></div>${icon('arrow')}</button>`).join('') || empty('Nada encontrado.', 'Tente outro termo.', 'search');
}
const EXPORTS = { stock: 'Estoque (saldo dos produtos)', movements: 'Movimentações de estoque', quotes: 'Orçamentos', tasks: 'Tarefas', services: 'Serviços', conversations: 'Notas de atendimento' };
function exportModal(kind) { openForm('Leve seus registros com você', 'export', selectField('Dados para exportar', 'kind', Object.entries(EXPORTS), EXPORTS[kind] ? kind : 'stock', 'required', true) + selectField('Formato', 'format', [['csv', 'CSV · compatível com planilhas'], ['pdf', 'PDF · impressão do navegador']], 'csv', 'required', true) + '<div class="notice full">CSV abre em aplicativos de planilhas. PDF abre um relatório para imprimir ou salvar em PDF.</div>', 'Gerar relatório'); }
function exportRows(kind) {
    if (kind === 'stock') return [['Produto', 'Marca', 'Unidade', 'Saldo', 'Mínimo', 'Custo por unidade', 'Situação'], ...state.products.map(p => { const st = stockOf(state, p.id); return [p.name, p.brand || '', p.unit, stockNumber(st.quantity), stockNumber(p.minimum), st.unitCost === null ? 'A conferir' : moneyPrecise(st.unitCost), st.quantity <= p.minimum ? 'Repor' : 'OK']; })];
    if (kind === 'movements') return [['Data', 'Produto', 'Movimento', 'Quantidade', 'Unidade', 'Custo por unidade', 'Observação'], ...state.movements.map(m => { const p = state.products.find(p => p.id === m.productId); return [m.date, p?.name || '', MOVEMENT_TYPES[m.type], stockNumber(m.quantity), p?.unit || '', m.unitCost === null ? 'A conferir' : moneyPrecise(m.unitCost), m.note || '']; })];
    if (kind === 'quotes') return [['Data', 'Contato', 'Telefone', 'Serviço', 'Situação', 'Valor', 'Observações'], ...state.quotes.map(q => [q.date, contactName(q.contact), q.contact?.phone || '', serviceLabel(q), QUOTE_STATUS[q.status], q.value === null ? '' : money(q.value), q.notes || ''])];
    if (kind === 'tasks') return [['Prazo', 'Tarefa', 'Área', 'Prioridade', 'Situação', 'Contato'], ...state.tasks.map(t => [t.due, t.title, t.area, t.priority, t.done ? 'Concluída' : 'Pendente', t.contact?.name || ''])];
    if (kind === 'services') return [['Serviço', 'Duração (min)', 'Descrição', 'Produtos', 'Antes', 'Depois'], ...state.services.map(s => [s.name, s.duration, s.description || '', s.products || '', s.before || '', s.after || ''])];
    return [['Contato', 'Telefone', 'Categoria', 'Situação', 'Resumo', 'Último registro'], ...state.conversations.map(v => [v.contact.name, v.contact.phone || '', v.category, { open: 'Pendente', waiting: 'Aguardando cliente', resolved: 'Resolvida' }[v.status], v.summary || '', v.messages.at(-1)?.text || ''])];
}
function exportData(kind, format = 'csv') {
    const rows = exportRows(kind), name = `hanne-${kind}-${localDate()}`;
    if (format === 'csv') { download('﻿' + rows.map(r => r.map(csvCell).join(';')).join('\n'), name + '.csv', 'text/csv;charset=utf-8'); toast('Arquivo CSV preparado.'); return; }
    const print = document.createElement('div');
    print.id = 'print-area';
    print.innerHTML = `<h1>${esc(EXPORTS[kind])} · ${esc(state.settings.name)}</h1><p>${longDate(localDate())}</p><table class="data-table"><thead><tr>${rows[0].map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    document.body.appendChild(print);
    window.print();
    print.remove();
}
function download(content, name, type) { const url = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }

/* ---------- Eventos ---------- */
document.addEventListener('input', e => {
    if (e.target.getAttribute?.('aria-invalid') === 'true' && e.target.checkValidity?.()) e.target.removeAttribute('aria-invalid');
    if (e.target.form) e.target.form.dataset.dirty = 'true';
    if (e.target.tagName === 'TEXTAREA' && e.target.closest('#dialog')) { e.target.style.height = 'auto'; e.target.style.height = Math.min(420, Math.max(115, e.target.scrollHeight)) + 'px'; }
    if (e.target.dataset.input === 'global-search') document.getElementById('search-results').innerHTML = searchResults(e.target.value);
    if (e.target.dataset.input === 'contact-name') {
        // Escolher um contato sugerido preenche o telefone, sem sobrescrever o que já foi digitado.
        const option = [...(e.target.list?.options || [])].find(o => o.value === e.target.value), phone = e.target.form?.elements.contactPhone;
        if (option && phone && !phone.value) phone.value = option.dataset.phone || '';
    }
});
document.addEventListener('change', async e => {
    const t = e.target, action = t.dataset.change;
    if (t.form) t.form.dataset.dirty = 'true';
    if (action === 'conv-filter') { ui.convFilter = t.value; render(); }
    if (action === 'quote-photos') {
        const files = [...t.files];
        if (quotePhotos.length + files.length > 3) { toast('Escolha até 3 fotos por orçamento.'); t.value = ''; return; }
        if (files.some(f => f.size > 500000 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) { toast('Use fotos JPG, PNG ou WebP com até 500 KB cada.'); t.value = ''; return; }
        const photos = await Promise.all(files.map(f => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(f); }))).catch(() => null);
        if (photos) { quotePhotos.push(...photos); const container = document.getElementById('quote-photos'); if (container) container.innerHTML = photoMarkup(); }
        else toast('Não foi possível ler a imagem.');
        t.value = '';
    }
});
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchModal(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-action]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('click', async e => {
    const target = e.target.closest('[data-action]');
    if (!target || target.closest('#wa-dialog')) return;
    const a = target.dataset.action, id = target.dataset.id;
    if (a === 'nav') { closeModal(); go(target.dataset.page); }
    if (a === 'mobile-menu') { ui.mobile = !ui.mobile; render(); }
    if (a === 'close-modal') closeModal();
    if (a === 'help') help();
    if (a === 'alerts') alerts();
    if (a === 'search') searchModal();
    if (a === 'focus') { state.focus = !state.focus; audit(state.focus ? 'Modo de foco ativado' : 'Modo de foco encerrado'); persist(state.focus ? 'Modo de foco ativo. Alertas de segurança continuam em destaque.' : 'Modo de foco encerrado.'); render(); }
    if (a === 'inbox-mode') { ui.inboxView = target.dataset.mode; render(); }
    if (a === 'v7-keep-editing') restoreEditing();
    if (a === 'v7-discard' && leaveConfirmation) { const pending = leaveConfirmation; leaveConfirmation = null; closeModal(true); pending.proceed(); }
    if (a === 'v7-route') {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
        e.preventDefault?.();
        try { navigateTo(JSON.parse(target.dataset.route)); } catch { toast('Não foi possível abrir este destino. Volte à lista e tente novamente.'); }
    }
    if (a === 'v2-reload') location.reload();
    if (a === 'v2-retry') { syncStatus = 'saving'; savePending = true; render(); flushSave(); }
    if (a === 'open-pending') { ui.inboxView = WHATSAPP_API && dataset === 'real' && whatsappPending > 0 ? 'whatsapp' : 'notes'; ui.convFilter = 'open'; ui.conversationId = pendingConvs()[0]?.id || ''; go('conversations'); }
    if (a === 'open-conversation' || a === 'select-conversation') {
        if (a === 'open-conversation') { closeModal(); ui.page = 'conversations'; ui.convFilter = 'all'; ui.inboxView = 'notes'; ui.mobile = false; }
        ui.conversationId = id; ui.threadOpen = true;
        const v = state.conversations.find(v => v.id === id);
        if (v?.unread) { v.unread = false; persist(); }
        render();
        if (a === 'open-conversation') window.scrollTo(0, 0);
    }
    if (a === 'open-origin') { closeModal(true); openOrigin(target.dataset.type, id); }
    if (a === 'back-inbox') { ui.threadOpen = false; render(); }
    if (a === 'new-conversation') conversationForm();
    if (a === 'edit-conversation') conversationForm(id);
    if (a === 'resolve-conversation') { const v = state.conversations.find(v => v.id === id); openForm(v.status === 'resolved' ? 'Reabrir conversa' : 'Concluir atendimento', 'resolve', `<div class="notice full">${esc(v.contact.name)}<br>${v.status === 'resolved' ? 'A conversa voltará à fila de pendências.' : 'Confirme que você avaliou e resolveu as solicitações desta conversa. Tarefas vinculadas não são concluídas automaticamente.'}</div>`, 'Confirmar', id); }
    if (a === 'classify') { const v = state.conversations.find(v => v.id === id); openForm('Revisar classificação', 'classify', selectField('Categoria confirmada por você', 'category', AI_CATEGORIES.map(t => [t, t]), v.category, 'required', true) + `<div class="full row wrap gap8">${btn('Sugerir com IA', 'ai-note-classify', 'spark', 'secondary sm', `data-id="${id}"`)}<span id="ai-classify-reason" class="small muted" role="status"></span></div><div class="notice full">A IA só sugere: a categoria vale quando você confirma.</div>`, 'Confirmar categoria', id); }
    if (a === 'note-quote') { const v = state.conversations.find(v => v.id === id); if (v) quoteForm(null, { contact: v.contact, origin: { type: 'note', id }, notes: v.summary || '' }); }
    if (a === 'note-task') { const v = state.conversations.find(v => v.id === id); if (v) taskForm(null, { contact: v.contact, origin: { type: 'note', id }, title: 'Responder ' + v.contact.name.split(' ')[0], area: 'Atendimento' }); }
    if (a === 'wa-note') { const v = state.conversations.find(v => v.id === id); if (v) waComposer(v.contact, v.draft || waMessages.free({ name: v.contact.name }), { context: v.category }); }
    if (a === 'change-password') passwordForm();
    if (a === 'change-email') emailForm();
    if (a === 'invite-salon') inviteForm();
    if (a === 'copy-invite') { const input = document.getElementById('invite-link'); toast(await copyText(input?.value || '') ? 'Link copiado.' : 'Selecione e copie o link manualmente.'); }
    if (a === 'cancel-invite' || a === 'salon-access') {
        target.disabled = true;
        try {
            if (a === 'cancel-invite') { await authPost('cancel-invite', { email: target.dataset.email }); toast('Convite cancelado. O link deixou de valer.'); }
            else { const off = target.dataset.disabled === '1'; await authPost('user-access', { id, disabled: off }); toast(off ? 'Salão desativado. As sessões dele foram encerradas; os dados continuam guardados.' : 'Salão reativado.'); }
            await loadSalons();
        } catch (err) { toast(err.message); target.disabled = false; }
    }
    if (a === 'ai-note-summary') void aiNote('summary', id);
    if (a === 'ai-note-reply') void aiNote('reply', id);
    if (a === 'ai-note-classify') {
        const v = state.conversations.find(x => x.id === id), select = target.closest('form')?.elements.category, reason = document.getElementById('ai-classify-reason');
        if (v && select) { target.disabled = true; reason.textContent = 'Consultando a IA…'; aiRun('classify', aiNoteMessages(v), aiContext(v.contact)).then(r => { select.value = r.category; reason.textContent = `Sugestão: ${r.category} · prioridade ${r.priority}${r.reason ? ' — ' + r.reason.replace(/[.!]+$/, '') : ''}. Confira e confirme.`; }).catch(err => { reason.textContent = err.message; }).finally(() => { target.disabled = false; }); }
    }
    if (a === 'wa-quote') { const f = target.closest('dialog')?.querySelector('form'), q = f?.elements.question.value || '', contact = makeContact(f?.elements.contactName.value, f?.elements.contactPhone.value), serviceName = f?.elements.serviceId.selectedOptions[0]?.textContent || 'seu atendimento'; if (!q.trim()) toast('Escreva as perguntas antes de enviar.'); else waComposer(contact, waMessages.quote({ name: contact?.name, service: serviceName, questions: q }), { title: 'Orçamento pelo WhatsApp', context: 'Perguntas do orçamento' }); }
    if (a === 'wa-draft') { const v = state.conversations.find(v => v.id === id), text = target.closest('dialog')?.querySelector('form')?.elements.text.value || ''; if (v) waComposer(v.contact, text, { title: 'Rascunho pelo WhatsApp', context: 'Rascunho da conversa' }); }
    if (a === 'new-service') serviceForm();
    if (a === 'edit-service') serviceForm(id);
    if (a === 'new-quote') quoteForm();
    if (a === 'edit-quote') quoteForm(id);
    if (a === 'quote-filter') { ui.quoteFilter = id; render(); }
    if (a === 'quote-task') { const q = state.quotes.find(q => q.id === id); if (q) { closeModal(true); taskForm(null, { contact: q.contact, origin: q.origin, quoteId: q.id, title: 'Retomar orçamento de ' + contactName(q.contact).split(' ')[0], area: 'Orçamento' }); } }
    if (a === 'remove-photo') { quotePhotos.splice(Number(target.dataset.index), 1); document.getElementById('quote-photos').innerHTML = photoMarkup(); }
    if (a === 'copy-question') { const text = document.querySelector('dialog form').elements.question.value; if (!text.trim()) toast('Escreva as perguntas antes de copiar.'); else toast(await copyText(text) ? 'Perguntas copiadas. Revise a destinatária antes de enviar.' : 'Não foi possível copiar. Selecione o texto manualmente.'); }
    if (a === 'new-task') taskForm();
    if (a === 'edit-task') taskForm(id);
    if (a === 'task-filter') { ui.taskFilter = id; render(); }
    if (a === 'toggle-task') { const t = state.tasks.find(t => t.id === id); if (!t) return; t.done = !t.done; audit(`${t.done ? 'Tarefa concluída' : 'Tarefa reaberta'}: ${t.title}`, !t.done, t.done); persist(t.done ? 'Tarefa concluída.' : 'Tarefa reaberta.'); render(); }
    if (a === 'review-draft') reviewDraft(id);
    if (a === 'new-product') productForm();
    if (a === 'edit-product') productForm(id);
    if (a === 'product-detail') { closeModal(true); productDetail(id); }
    if (a === 'stock-tab') { ui.inventoryTab = id; ui.inventoryPageIndex = 1; render(); }
    if (a === 'stock-purchase') movementForm('purchase', id);
    if (a === 'stock-use') movementForm('use', id);
    if (a === 'stock-loss') movementForm('loss', id);
    if (a === 'stock-value') movementForm('valuation', id);
    if (a === 'edit-movement') movementEditForm(id);
    if (a === 'export-modal') exportModal(target.dataset.kind);
    if (a === 'backup') { download(JSON.stringify(state, null, 2), `hanne-${dataset === 'example' ? 'exemplo' : 'dados'}-${localDate()}.json`, 'application/json'); toast('Cópia dos registros preparada.'); }
    if (a === 'audit') modal('Histórico de ações', `<div class="dialog-body">${state.audit.map(x => `<div class="audit-row"><strong>${esc(x.action)}</strong><time>${new Date(x.at).toLocaleString('pt-BR')} · ${esc(x.by)}</time>${x.before !== '' && x.before !== undefined ? `<p class="muted tiny">Antes: ${esc(typeof x.before === 'string' ? x.before : JSON.stringify(x.before))}</p>` : ''}${x.after !== '' && x.after !== undefined ? `<p class="muted tiny">Depois: ${esc(typeof x.after === 'string' ? x.after : JSON.stringify(x.after))}</p>` : ''}</div>`).join('')}</div>`, btn('Fechar', 'close-modal'), true);
    if (a === 'integrations') { if (dataset !== 'real') toast('Abra os dados reais para configurar o WhatsApp.'); else whatsapp.configure(); }
});

/** Gravação dos formulários: trabalha numa cópia, valida e só então substitui o estado. */
document.addEventListener('submit', async e => {
    const form = e.target, kind = form.dataset.form;
    if (!kind || kind.startsWith('wa-') || kind === 'v14-restore') return;
    e.preventDefault();
    const fd = new FormData(form), val = n => String(fd.get(n) ?? '').trim(), id = val('id');
    const error = document.getElementById(kind === 'settings' ? 'settings-error' : 'form-error');
    if (error) error.textContent = '';
    let next = structuredClone(state), action = 'Registros atualizados', message = 'Alterações salvas na sua conta.', close = true;
    const origin = () => { try { const o = val('origin') ? JSON.parse(val('origin')) : null; return o && ['whatsapp', 'note'].includes(o.type) && typeof o.id === 'string' ? { type: o.type, id: o.id } : null; } catch { return null; } };
    try {
        for (const el of form.querySelectorAll('input[required]:not(:disabled),textarea[required]:not(:disabled)'))
            if ((['text', 'tel', 'search'].includes(el.type) || el.tagName === 'TEXTAREA') && !el.value.trim()) throw Error('Preencha os campos obrigatórios com informações válidas.');
        if (kind === 'settings') {
            next.settings = { ...next.settings, name: val('name'), responseMinutes: Number(val('responseMinutes')) };
            action = 'Dados do ateliê alterados'; message = 'Configurações salvas.'; close = false;
        }
        if (kind === 'conversation') {
            const contact = formContact(val, true), v = next.conversations.find(v => v.id === id), data = { contact, category: val('category'), status: val('status') };
            if (v) { Object.assign(v, data); action = 'Atendimento atualizado: ' + contact.name; }
            else {
                const nid = uid();
                next.conversations.unshift({ id: nid, ...data, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), unread: false, summary: '', draft: '', messages: [{ text: val('text'), type: 'incoming', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }] });
                ui.inboxView = 'notes'; ui.conversationId = nid; ui.convFilter = 'all';
                action = 'Atendimento registrado: ' + contact.name;
            }
            message = 'Atendimento salvo. Nada foi enviado à cliente.';
        }
        if (kind === 'note') {
            const v = next.conversations.find(v => v.id === id);
            if (!v || !val('text')) throw Error('Escreva o registro antes de salvar.');
            const type = val('type') === 'incoming' ? 'incoming' : 'note';
            v.messages.push({ text: val('text'), type, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
            if (type === 'incoming' && v.status === 'resolved') v.status = 'open';
            action = (type === 'note' ? 'Nota interna registrada: ' : 'Mensagem da cliente registrada: ') + v.contact.name;
            message = type === 'note' ? 'Nota interna salva. Não foi enviada à cliente.' : 'Mensagem da cliente registrada.';
        }
        if (kind === 'classify') { const v = next.conversations.find(v => v.id === id); v.category = val('category'); action = 'Classificação confirmada: ' + v.category; message = 'Categoria atualizada por você.'; }
        if (kind === 'resolve') { const v = next.conversations.find(v => v.id === id); v.status = v.status === 'resolved' ? 'open' : 'resolved'; action = 'Situação da conversa confirmada'; message = v.status === 'resolved' ? 'Conversa resolvida por você.' : 'Conversa reaberta.'; }
        if (kind === 'draft') {
            const v = next.conversations.find(v => v.id === id); if (v) v.draft = val('text');
            const ok = await copyText(val('text'));
            action = 'Rascunho revisado e ' + (ok ? 'copiado' : 'salvo');
            message = ok ? 'Texto copiado. O envio é manual.' : 'Rascunho salvo. Selecione e copie o texto manualmente.';
        }
        if (kind === 'service') {
            const s = next.services.find(s => s.id === id), data = { name: val('name'), description: val('description'), duration: Number(val('duration')), products: val('products'), before: val('before'), after: val('after') };
            if (s) Object.assign(s, data); else next.services.push({ id: uid(), ...data });
            action = (s ? 'Serviço alterado: ' : 'Serviço cadastrado: ') + data.name; message = 'Catálogo atualizado.';
        }
        if (kind === 'quote') {
            const q = next.quotes.find(q => q.id === id), value = val('value') === '' ? null : amount(cents(Number(val('value'))));
            if (val('status') === 'approved' && value === null) throw Error('Defina o valor antes de marcar como avaliado.');
            const serviceId = val('serviceId') || null, data = { contact: formContact(val, true), serviceId, serviceName: serviceId ? service(serviceId).name : (q?.serviceName || ''), status: val('status'), value, notes: val('notes'), question: val('question'), photos: [...quotePhotos] };
            if (q) Object.assign(q, data); else next.quotes.push({ id: uid(), date: localDate(), origin: origin(), ...data });
            action = q ? 'Orçamento revisado: ' + data.contact.name : 'Orçamento criado: ' + data.contact.name; message = 'Avaliação salva. Nenhuma mensagem foi enviada.';
        }
        if (kind === 'task') {
            const t = next.tasks.find(t => t.id === id), data = { title: val('title'), area: val('area'), priority: val('priority'), due: val('due'), quoteId: val('quoteId') || null, contact: formContact(val, false) };
            if (!validCalendarDate(data.due)) throw Error('Confira o prazo.');
            if (t) Object.assign(t, data); else next.tasks.push({ id: uid(), done: false, origin: origin(), ...data });
            action = (t ? 'Tarefa alterada: ' : 'Tarefa criada: ') + data.title; message = 'Tarefa salva.';
        }
        if (kind === 'product') {
            const p = next.products.find(p => p.id === id), packageSize = qty(Number(val('packageSize'))), minimum = qty(Number(val('minimum')));
            if (!(packageSize > 0) || !(minimum >= 0)) throw Error('Confira embalagem e estoque mínimo.');
            if (p) { Object.assign(p, { name: val('name'), brand: val('brand'), packageSize, minimum }); action = 'Produto corrigido: ' + p.name; message = 'Produto corrigido.'; }
            else {
                const quantity = qty(Number(val('quantity'))), cost = val('packageCost') === '' ? null : Number(val('packageCost')) / packageSize, productId = uid();
                if (val('unit') === 'un' && !Number.isInteger(quantity)) throw Error('Produtos controlados em unidades precisam de quantidades inteiras.');
                if (!validCalendarDate(val('date')) || val('date') > localDate()) throw Error('Use uma data de contagem até hoje.');
                next.products.push({ id: productId, name: val('name'), brand: val('brand'), unit: val('unit'), packageSize, minimum });
                next.movements.push({ id: uid(), productId, type: 'opening', date: val('date'), quantity, unitCost: cost, note: 'Saldo inicial conferido manualmente' });
                action = 'Produto cadastrado: ' + val('name'); message = 'Produto e saldo inicial registrados.';
            }
        }
        if (kind === 'movement') {
            const type = val('type'), p = next.products.find(p => p.id === val('productId'));
            if (!validCalendarDate(val('date'))) throw Error('Confira a data.');
            next = stockEntry(next, { id: uid(), productId: val('productId'), type, date: val('date'), quantity: Number(val('quantity') || 0), total: val('total') === '' ? null : Number(val('total')), unitCost: type === 'valuation' ? Number(val('packageCost')) / (p?.packageSize || 1) : null, note: val('note') });
            action = `${MOVEMENT_TYPES[type]} registrada: ${p?.name || ''}`; message = { purchase: 'Entrada registrada e estoque atualizado.', use: 'Uso registrado.', loss: 'Perda registrada.', valuation: 'Custo conferido.' }[type];
        }
        if (kind === 'edit-movement') {
            const m = next.movements.find(m => m.id === id);
            if (!m) throw Error('Movimento não encontrado.');
            if (!validCalendarDate(val('date')) || val('date') > localDate()) throw Error('Confira a data.');
            m.date = val('date'); m.note = val('note');
            if (m.type !== 'valuation') { const q = qty(Number(val('quantity'))); if (!(q > 0) && m.type !== 'opening') throw Error('Informe a quantidade.'); m.quantity = ['use', 'loss'].includes(m.type) ? -q : q; }
            if (m.type === 'purchase') { const total = val('total') === '' ? null : amount(cents(Number(val('total')))); if (total !== null && !(total > 0)) throw Error('Informe o valor da entrada ou deixe em branco.'); m.unitCost = total === null ? null : total / m.quantity; m.total = total; }
            if (m.type === 'opening') m.unitCost = val('unitCost') === '' ? null : Number(val('unitCost'));
            if (m.type === 'valuation') { const c = Number(val('unitCost')); if (!(c > 0)) throw Error('Informe o custo.'); m.unitCost = c; }
            const dates = next.movements.filter(x => x.productId === m.productId).map(x => x.date);
            if (dates.some((d, i) => i && d < dates[i - 1])) throw Error('A nova data ficaria fora da ordem dos outros movimentos deste produto.');
            recost(next);
            action = 'Movimento de estoque corrigido'; message = 'Estoque corrigido e recalculado.';
        }
        if (kind === 'export') { form.dataset.dirty = ''; closeModal(); exportData(val('kind'), val('format')); return; }
        validateState(next, state);
        state = next;
        audit(action);
        if (persist(message, form)) { if (close) closeModal(); render(); }
    }
    catch (err) {
        if (error) { error.textContent = err.message; error.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }
        else toast(err.message);
    }
});

/* ---------- Gravação, sincronização e restauração ---------- */
function syncBanner() {
    if (syncStatus === 'error' || syncStatus === 'conflict')
        return `<div class="notice red sync-banner">${icon('warning')}<div class="grow"><strong>Alterações ainda não salvas</strong><p>${esc(syncError)}</p></div><div class="row wrap">${syncStatus === 'error' ? btn('Tentar salvar', 'v2-retry', 'undo', 'secondary sm') : ''}${btn('Exportar rascunho', 'backup', 'download', 'secondary sm')}${btn('Recarregar', 'v2-reload', 'undo', 'secondary sm')}</div></div>`;
    return syncStatus === 'saving' ? '<div class="sync-line" role="status">Salvando com segurança…</div>' : '';
}
/**
 * queueSave — Valida o estado e sinaliza que há uma versão pendente para a fila de gravação.
 */
function queueSave(message) {
    try {
        validateState(state, confirmedState);
    }
    catch (e) {
        state = structuredClone(confirmedState);
        toast(e.message);
        return false;
    }
    savePending = true;
    lastSaveMessage = message || 'Registros atualizados.';
    syncStatus = 'saving';
    flushSave();
    return true;
}
/**
 * flushSave — Serializa POSTs com revisão otimista; atualiza a confirmação ou interrompe edições em caso de conflito.
 */
async function flushSave() {
    if (saving || !savePending)
        return;
    saving = true;
    savePending = false;
    const snapshot = structuredClone(state), action = state.audit[0]?.action || 'Registros atualizados';
    try {
        const r = await fetch(stateURL(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: snapshot, revision, action }) }), d = await r.json();
        if (!r.ok) {
            syncStatus = r.status === 409 ? 'conflict' : 'error';
            throw Error(d.error || 'Falha ao salvar.');
        }
        revision = d.revision;
        lastSavedAt = d.updatedAt || lastSavedAt;
        confirmedState = structuredClone(snapshot);
        if (d.audit) {
            confirmedState.audit = d.audit;
            if (!savePending)
                state.audit = d.audit;
        }
        syncStatus = savePending ? 'saving' : 'saved';
        if (!savePending)
            toast(lastSaveMessage);
    }
    catch (e) {
        syncError = e.message;
        savePending = true;
        if (syncStatus !== 'conflict')
            syncStatus = 'error';
    }
    finally {
        saving = false;
        render();
        if (savePending && syncStatus === 'saving')
            flushSave();
    }
}
/**
 * bootstrap — Carrega a base selecionada da API e inicia a interface autenticada.
 */
async function bootstrap() {
    document.getElementById('app').innerHTML = '<main class="boot"><div class="brand-name">hanne.</div><p>Preparando seu espaço privado…</p></main>';
    try {
        const r = await fetch(stateURL(), { cache: 'no-store' }), d = await r.json();
        if (!r.ok)
            throw Error(d.error || 'Falha ao carregar.');
        state = d.state;
        revision = d.revision;
        confirmedState = structuredClone(state);
        lastSavedAt = d.updatedAt;
        syncStatus = 'saved';
        const initialTarget = parseDestination(location.hash || '');
        if (initialTarget) navigateTo(initialTarget, { replace: true }); else render();
    }
    catch (e) {
        document.getElementById('app').innerHTML = `<main class="boot"><h1>Seu espaço precisa reconectar.</h1><p>${esc(e.message)}</p><button class="btn primary" data-action="v2-reload">Tentar novamente</button></main>`;
    }
}
window.addEventListener('beforeunload', e => {
    if (saving || savePending || document.querySelector?.('#dialog form')?.dataset.dirty === 'true') {
        e.preventDefault();
        e.returnValue = '';
    }
});
/**
 * Delegação de click: identifica a ação pelo atributo data-* do elemento.
 * Os formulários v2 usam cópia do estado e validação antes da gravação; o listener legado ignora esses formulários.
 */
document.addEventListener('click', e => {
    if (!['error', 'conflict', 'loading'].includes(syncStatus))
        return;
    const b = e.target.closest('[data-action]');
    if (b && !['v2-retry', 'v2-reload', 'backup', 'nav', 'close-modal', 'help', 'export-modal', 'search', 'v3-dataset', 'v5-theme', 'v7-route', 'v7-keep-editing', 'v7-discard', 'inbox-mode', 'mobile-menu', 'stock-tab', 'quote-filter', 'task-filter'].includes(b.dataset.action)) {
        e.stopImmediatePropagation();
        toast('Resolva a sincronização antes de alterar os registros.');
    }
}, true);
/**
 * Delegação de submit: identifica a ação pelo atributo data-* do elemento.
 * Os formulários v2 usam cópia do estado e validação antes da gravação; o listener legado ignora esses formulários.
 */
document.addEventListener('submit', e => {
    if (saving || ['error', 'conflict', 'loading'].includes(syncStatus)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toast(saving ? 'Aguarde a gravação atual antes de confirmar novamente.' : 'Resolva a sincronização antes de continuar.');
        return;
    }
    const form = e.target;
    if (!validateVisibleControls(form)) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
/**
 * baseIsEmpty — Indica que a base real ainda não tem registros de negócio; só então uma cópia pode ser restaurada.
 */
const baseIsEmpty = () => ['conversations', 'quotes', 'tasks', 'products', 'movements'].every(k => !state[k].length);
// Restauração de cópia JSON: usada para trazer os dados de outra hospedagem para uma base real ainda vazia.
document.addEventListener('click', e => {
    if (!e.target.closest?.('[data-action="v14-restore"]'))
        return;
    if (dataset !== 'real' || !baseIsEmpty()) { toast('A restauração só é permitida em uma base real ainda vazia.'); return; }
    openForm('Restaurar cópia JSON', 'v14-restore', `<div class="notice full">Use o arquivo gerado por “Cópia completa JSON” na versão anterior do sistema. Todos os registros do arquivo serão gravados nesta conta, que ainda está vazia.</div><label class="field full"><span>Arquivo da cópia (.json)</span><input type="file" name="file" accept="application/json,.json" required></label><label class="row full small"><input type="checkbox" name="confirm" required>Confirmo que este arquivo contém os dados reais do ateliê.</label>`, 'Restaurar registros');
});
document.addEventListener('submit', async e => {
    const form = e.target;
    if (form.dataset?.form !== 'v14-restore')
        return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const error = form.querySelector('#form-error');
    try {
        const file = form.elements.file.files[0];
        if (!file || file.size > 3000000)
            throw Error('Escolha o arquivo .json da cópia, com até 3 MB.');
        let next;
        try { next = JSON.parse(await file.text()); }
        catch { throw Error('O arquivo não é uma cópia JSON válida.'); }
        if (next?.datasetKind === 'example')
            throw Error('Este arquivo é da demonstração e não pode entrar nos dados reais.');
        if (!baseIsEmpty())
            throw Error('A base já possui registros. A restauração foi cancelada para não sobrescrevê-los.');
        validateState(next);
        next.audit = Array.isArray(next.audit) ? next.audit : [];
        state = next;
        audit('Cópia JSON restaurada', '', file.name.slice(0, 100));
        if (queueSave('Registros restaurados da cópia.'))
            closeModal(true);
    }
    catch (err) {
        error.textContent = err.message;
    }
}, true);
/**
 * stockNumber — Formata quantidade de estoque com até três casas decimais.
 */
function datasetBanner() {
    // Nos dados reais o aviso só ocupava espaço; a demonstração continua acessível em Configurações e no menu.
    if (dataset !== 'example')
        return '';
    return `<section class="dataset-banner ${dataset === 'example' ? 'example' : 'real'}" aria-label="${dataset === 'example' ? 'Dados fictícios' : 'Dados reais'}"><span class="dataset-symbol">${icon(dataset === 'example' ? 'spark' : 'shield')}</span><div class="grow"><strong>${dataset === 'example' ? 'Você está na demonstração' : 'Você está nos dados reais'}</strong><p>${dataset === 'example' ? 'Dados fictícios para explorar o sistema.' : 'Registros da sua operação, separados dos exemplos.'}</p></div>${btn(dataset === 'example' ? 'Usar dados reais' : 'Ver demonstração', 'v3-dataset', 'arrow', 'text', `data-dataset="${dataset === 'example' ? 'real' : 'example'}"`)}</section>`;
}
/**
 * Delegação de click: identifica a ação pelo atributo data-* do elemento.
 * Os formulários v2 usam cópia do estado e validação antes da gravação; o listener legado ignora esses formulários.
 */
document.addEventListener('click', e => {
    const b = e.target.closest('[data-action="v3-dataset"]');
    if (!b)
        return;
    if (saving || savePending) {
        toast('Aguarde o salvamento ou exporte e confira as alterações pendentes antes de trocar de base.');
        return;
    }
    const selected = b.dataset.dataset === 'real' ? 'real' : 'example';
    try {
        localStorage.setItem('hanne-data-view', selected);
    }
    catch { }
    location.search = '?dados=' + (selected === 'real' ? 'reais' : 'exemplo');
});
bootstrap();
void loadAccountInfo();
void loadAccountInfo();

/** Troca só a aparência; atualiza os controles sem descartar campos em edição. */
document.addEventListener('click', e => {
    const button = e.target.closest('[data-action="v5-theme"]');
    if (!button) return;
    theme = applyTheme(button.dataset.theme, document.documentElement, globalThis.localStorage);
    document.querySelectorAll('[data-action="v5-theme"]').forEach(control => {
        const selected = control.dataset.theme === theme;
        control.classList.toggle('active', selected);
        control.setAttribute('aria-pressed', String(selected));
    });
});


/** Exclusão uniforme: prévia dos vínculos, confirmação explícita e transação por revisão. */
const deletionLabels = { services: 'Serviço', conversations: 'Nota de atendimento', quotes: 'Orçamento', tasks: 'Tarefa', products: 'Produto', movements: 'Movimento de estoque', audit: 'Histórico de ações', settings: 'Configurações' };
function deletionName(key, item) {
    const product = state.products.find(p => p.id === item.productId);
    if (key === 'movements') return [product?.name || 'Produto', MOVEMENT_TYPES[item.type], item.date, stockNumber(item.quantity) + ' ' + (product?.unit || '')].join(' · ');
    return [item.name || item.title || item.action || item.contact?.name || 'Registro', key === 'quotes' ? serviceLabel(item) : '', item.date || item.due || ''].filter(Boolean).join(' · ');
}
function deletionList() {
    const collections = { services: ['services'], conversations: ['conversations'], quotes: ['quotes'], tasks: ['tasks'], inventory: ['products', 'movements'], settings: allCollections }[ui.page] || allCollections;
    const rows = collections.flatMap(key => state[key].map(x => `<div class="setting-row" data-delete-row><div><strong>${esc(deletionLabels[key] + ': ' + deletionName(key, x))}</strong></div>${btn('Excluir', 'v12-delete-confirm', '', 'danger sm', `data-collection="${key}" data-id="${esc(x.id)}"`)}</div>`));
    modal('Excluir informações', `<div class="dialog-body"><p>Escolha um registro. Antes de apagar, você verá tudo o que será apagado ou desvinculado junto. A exclusão não pode ser desfeita. Exporte uma cópia nas configurações se quiser guardá-la.</p><label class="field"><span>Buscar registro para excluir</span><input id="deletion-search" type="search" placeholder="Nome, data ou produto"></label>${rows.join('') || empty('Nenhum registro para excluir.')}${ui.page === 'settings' ? btn('Apagar todos os dados', 'v12-delete-confirm', '', 'danger', 'data-collection="operation" data-id="all"') : ''}</div>`, btn('Fechar', 'close-modal', '', 'secondary'));
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action^="v12-delete-"]');if(!button)return;
 if(saving||syncStatus!=='saved'){toast('Aguarde a sincronização antes de excluir.');return;}
 const {action,collection,id}=button.dataset;
 if(action==='v12-delete-list')return deletionList();
 if(action==='v12-delete-confirm')try{
  const plan=deletionPlan(state,collection,id);
  modal('Confirmar exclusão definitiva',`<div class="dialog-body"><p><strong>${plan.entries.filter(x=>!x.unlinked).length} registro(s) serão apagados${plan.entries.some(x=>x.unlinked)?' e alguns desvinculados':''}:</strong></p><ul>${plan.entries.map(x=>`<li>${x.unlinked?'Desvincular · ':''}${esc(deletionLabels[x.collection]+': '+(state[x.collection]?.find(item=>item.id===x.id)?deletionName(x.collection,state[x.collection].find(item=>item.id===x.id)):x.label))}</li>`).join('')}</ul><p>Ao excluir uma entrada de estoque, os movimentos posteriores do mesmo produto também são removidos. Orçamentos e tarefas ligados ao registro apenas perdem o vínculo. Mensagens reais do WhatsApp e credenciais de acesso são geridas separadamente. Um comprovante técnico da exclusão permanece no sistema.</p><label class="row"><input id="delete-agree" type="checkbox">Conferi a lista e quero excluir definitivamente.</label><label class="field delete-password"><span>Senha da conta (a mesma do login)</span><input id="delete-password" type="password" autocomplete="current-password" maxlength="200" placeholder="Digite sua senha para confirmar"><small>Só quem sabe a senha consegue excluir, mesmo com o app aberto em outro aparelho.</small></label><p id="delete-error" class="form-error" role="alert"></p></div>`,btn('Manter registros','close-modal','','secondary')+btn('Excluir definitivamente','v12-delete-apply','','danger',`data-collection="${collection}" data-id="${esc(id)}"`));
  document.querySelector('[data-action="close-modal"]')?.focus();
 }catch(e){toast(e.message);}
 if(action==='v12-delete-apply'){
  const passwordInput=document.querySelector('#delete-password'),deleteError=document.querySelector('#delete-error'),password=passwordInput?.value||'';
  if(deleteError)deleteError.textContent='';
  if(!document.querySelector('#delete-agree')?.checked){if(deleteError)deleteError.textContent='Marque a confirmação após conferir os vínculos.';else toast('Marque a confirmação após conferir os vínculos.');return;}
  if(!password){if(deleteError)deleteError.textContent='Digite a senha da conta para confirmar.';passwordInput?.focus();return;}
  button.disabled=true;button.textContent='Excluindo…';saving=true;
  try{
   const plan=deletionPlan(state,collection,id);
   const response=await fetch(stateURL(),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,collection,id,confirmed:true,password,plan:JSON.stringify(plan.entries)})});
   const data=await response.json();if(!response.ok)throw Error(data.error);
   state=data.state;confirmedState=structuredClone(state);revision=data.revision;lastSavedAt=data.updatedAt;syncStatus='saved';closeModal(true);render();toast('Exclusão confirmada. Estoque e vínculos atualizados.');
  }catch(e){const msg=e.message||'A exclusão não foi confirmada. Recarregue para conferir antes de tentar novamente.';if(deleteError)deleteError.textContent=msg;else toast(msg);if(passwordInput){passwordInput.value='';passwordInput.focus();}button.disabled=false;button.textContent='Excluir definitivamente';}finally{saving=false;}
 }
});

/** Sair da conta: direto quando está tudo salvo; com gravação pendente, pede confirmação antes. */
document.addEventListener('click', event => {
    if (!event.target.closest('[data-salon-logout]')) return;
    event.preventDefault();
    const logout = async () => { try { const r = await fetch('/api/auth/logout', { method: 'POST' }); if (!r.ok) throw Error(); location.replace('/login'); } catch { toast('Não foi possível sair. Tente novamente.'); } };
    if (saving || savePending) confirmLeaving('Há alterações sendo salvas. Se sair agora, elas podem se perder.', logout); else void logout();
});

document.addEventListener('input',event=>{if(event.target.id!=='deletion-search')return;const query=event.target.value.toLocaleLowerCase('pt-BR');document.querySelectorAll('[data-delete-row]').forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase('pt-BR').includes(query);});});
/** Enter na senha confirma a exclusão. */
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'delete-password') { e.preventDefault(); document.querySelector('#dialog [data-action="v12-delete-apply"]')?.click(); } });

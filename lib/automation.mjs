/**
 * Automação do atendimento pelo WhatsApp (painel Automação).
 *
 * Mensagens automáticas são REGRAS: "quando <gatilho>, envie <mensagem> depois de <espera>". Gatilhos:
 *   greeting  a cliente só cumprimentou ("oi", "bom dia") e não disse o que quer
 *   request   a cliente disse o que precisa (ex.: aviso de "estou ocupada")
 *   category  o assunto da conversa é um dos assuntos da lista (ex.: Pagamento realizado)
 *   keywords  a mensagem tem certas palavras (ex.: "endereço", "onde fica")
 *   away      a mensagem chegou fora do horário de atendimento
 *   first     é a primeira mensagem de um contato novo
 * Cada regra sai no máximo uma vez por atendimento (episódio). As regras de ABERTURA (boas-vindas, estou ocupada, fora do
 * horário, contato novo) só saem se a profissional ainda não respondeu no atendimento; as de ASSUNTO (palavras-chave e
 * assunto) continuam valendo depois da resposta, olhando só o que a cliente escreveu depois dela.
 * Depois de uma mensagem automática, a próxima regra só pode sair quando a cliente escrever de novo.
 *
 * Assuntos (categorias) têm cor e prioridade: alta, normal, baixa ou "a IA decide" pelo resumo da cliente.
 */
export const GAP_HOURS = 8;
export const VERSION = 2;
export const COLORS = ['purple', 'blue', 'green', 'orange', 'red', 'pink', 'teal', 'gray'];
export const PRIORITIES = ['alta', 'normal', 'baixa', 'auto'];
export const TRIGGERS = ['greeting', 'request', 'category', 'keywords', 'away', 'first'];
/** Gatilhos de abertura: perdem o sentido depois que a profissional respondeu. */
export const OPENING_TRIGGERS = ['greeting', 'request', 'away', 'first'];
export const DEFAULT_CATEGORIES = [
  { name: 'Segurança', color: 'red', priority: 'alta', description: 'Reação alérgica, ardência, queda de cabelo, queimadura, dor ou qualquer risco à saúde.' },
  { name: 'Agendamento urgente', color: 'orange', priority: 'alta', description: 'Quer horário para até 3 dias depois da mensagem (hoje, amanhã ou depois de amanhã).' },
  { name: 'Agendamento', color: 'blue', priority: 'normal', description: 'Quer marcar, remarcar, cancelar ou saber horários disponíveis com mais de 3 dias de antecedência (para hoje, amanhã ou depois de amanhã é Agendamento urgente).' },
  { name: 'Pagamento pendente', color: 'orange', priority: 'alta', description: 'Pagamento em aberto: pede chave Pix, dados para pagar, link, cobrança ou combina como vai pagar.' },
  { name: 'Pagamento realizado', color: 'green', priority: 'alta', description: 'Avisa que já pagou ou envia comprovante de pagamento.' },
  { name: 'Pós-procedimento', color: 'teal', priority: 'auto', description: 'Dúvidas ou cuidados depois de um procedimento já feito.' },
  { name: 'Orçamento', color: 'purple', priority: 'auto', description: 'Quer saber preço ou pede avaliação de um serviço.' },
  { name: 'Informações gerais', color: 'gray', priority: 'auto', description: 'Endereço, horário de funcionamento, formas de pagamento e outras dúvidas.' },
  { name: 'Reclamação', color: 'red', priority: 'auto', description: 'Insatisfação com um serviço ou atendimento.' },
  { name: 'Exige esclarecimentos', color: 'pink', priority: 'auto', description: 'Mensagem confusa ou que precisa de mais detalhes para entender.' },
  { name: 'Spam ou suspeita', color: 'gray', priority: 'baixa', description: 'Propaganda, golpe ou mensagem sem relação com o ateliê.' },
];
const WORKDAYS = [1, 2, 3, 4, 5, 6];
export const DEFAULT_RULES = [
  { id: 'greeting', name: 'Boas-vindas', enabled: true, trigger: 'greeting', delay: 120, text: 'Olá, {nome}! 😊 Como posso ajudar?' },
  { id: 'busy', name: 'Estou ocupada', enabled: false, trigger: 'request', delay: 30, text: 'Certo, no momento estou ocupada, assim que estiver disponível te envio uma mensagem. Agradecemos o contato, até breve.' },
  { id: 'away', name: 'Fora do horário', enabled: false, trigger: 'away', delay: 0, hours: { days: WORKDAYS, start: '09:00', end: '18:00' }, text: 'Olá, {nome}! Nosso horário de atendimento é de segunda a sábado, das 9h às 18h. Assim que abrirmos, eu te respondo 😊' },
  { id: 'paid', name: 'Pagamento recebido', enabled: false, trigger: 'category', category: 'Pagamento realizado', delay: 30, text: 'Recebi, {nome}! Obrigada 💜 Vou conferir e já te confirmo.' },
];
/** Modelos oferecidos em "Nova automação". */
export const TEMPLATES = [
  { name: 'Endereço', trigger: 'keywords', keywords: ['endereço', 'onde fica', 'localização'], delay: 0, text: 'Nosso endereço é: (escreva aqui o endereço do ateliê).' },
  { name: 'Boas-vindas a contato novo', trigger: 'first', delay: 60, text: 'Olá, {nome}! Seja bem-vinda ao ateliê 💜 Me conta o que você precisa?' },
  { name: 'Formas de pagamento', trigger: 'keywords', keywords: ['pix', 'cartão', 'parcela'], delay: 0, text: 'Aceitamos Pix, cartão de débito e crédito.' },
  { name: 'Pagamento pendente', trigger: 'category', category: 'Pagamento pendente', delay: 30, text: 'Oi, {nome}! A chave Pix é: (escreva aqui). Assim que pagar, me manda o comprovante, por favor.' },
];

const text = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, max);
const seconds = (value, fallback, min, max) => { const n = Math.round(Number(value)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; };
const flag = (value, fallback) => typeof value === 'boolean' ? value : fallback;
const clock = (value, fallback) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) ? String(value) : fallback;
const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);

function normalizeCategories(list, migrate) {
  const out = [];
  for (const c of Array.isArray(list) ? list.slice(0, 24) : []) {
    const name = text(c?.name, 40);
    if (!name || out.some(x => x.name.toLowerCase() === name.toLowerCase())) continue;
    const known = DEFAULT_CATEGORIES.find(d => d.name === name);
    out.push({ name, color: COLORS.includes(c?.color) ? c.color : 'gray', priority: PRIORITIES.includes(c?.priority) ? c.priority : migrate && known ? known.priority : 'auto', description: text(c?.description, 220) || (migrate && known ? known.description : '') });
  }
  if (!out.length) return DEFAULT_CATEGORIES.map(c => ({ ...c }));
  // Configuração antiga (antes das prioridades): ganha os assuntos de pagamento e a regra dos 3 dias.
  if (migrate) {
    for (const d of DEFAULT_CATEGORIES.filter(c => c.name.startsWith('Pagamento')).reverse()) if (!out.some(c => c.name === d.name)) out.splice(Math.min(3, out.length), 0, { ...d });
    const urgent = out.find(c => c.name === 'Agendamento urgente');
    if (urgent && /hoje ou amanhã\.?$/.test(urgent.description)) urgent.description = DEFAULT_CATEGORIES[1].description;
  }
  // Descrição antiga de Agendamento não separava do urgente: a IA classificava "para amanhã" como Agendamento comum.
  const plain = out.find(c => c.name === 'Agendamento');
  if (plain && plain.description === 'Quer marcar, remarcar, cancelar ou saber horários disponíveis.') plain.description = DEFAULT_CATEGORIES[2].description;
  return out;
}
function normalizeRule(r, categories, i) {
  const trigger = TRIGGERS.includes(r?.trigger) ? r.trigger : 'keywords';
  const rule = { id: slug(r?.id) || 'r' + (i + 1) + '-' + Math.random().toString(36).slice(2, 7), name: text(r?.name, 60) || 'Automação', enabled: flag(r?.enabled, false), trigger, delay: seconds(r?.delay, trigger === 'greeting' ? 120 : 0, 0, 3600), text: text(r?.text, 1000) };
  if (trigger === 'greeting') rule.delay = Math.max(15, rule.delay);
  if (trigger === 'category') rule.category = categories.some(c => c.name === r?.category) ? r.category : categories[0].name;
  if (trigger === 'keywords') rule.keywords = (Array.isArray(r?.keywords) ? r.keywords : String(r?.keywords || '').split(',')).map(k => text(k, 40).toLowerCase()).filter(Boolean).slice(0, 20);
  if (trigger === 'away') {
    const days = Array.isArray(r?.hours?.days) ? [...new Set(r.hours.days.map(Number).filter(d => d >= 0 && d <= 6))].sort() : WORKDAYS;
    rule.hours = { days, start: clock(r?.hours?.start, '09:00'), end: clock(r?.hours?.end, '18:00') };
  }
  return rule;
}
/** Valida e completa a configuração. Converte a configuração antiga (boas-vindas e ocupada fixas) em regras. */
export function normalizeConfig(input = {}) {
  const migrate = input.version !== VERSION;
  const categories = normalizeCategories(input.categories, migrate);
  let rules = Array.isArray(input.rules) ? input.rules : DEFAULT_RULES.map(r => ({ ...r }));
  if (migrate && !Array.isArray(input.rules)) {
    rules = DEFAULT_RULES.map(r => ({ ...r }));
    if (input.greeting) Object.assign(rules[0], { enabled: flag(input.greeting.enabled, true), delay: input.greeting.delay ?? 120, text: input.greeting.text || rules[0].text });
    if (input.busy) Object.assign(rules[1], { enabled: flag(input.busy.enabled, false), delay: input.busy.delay ?? 30, text: input.busy.text || rules[1].text });
  }
  const ids = new Set(), out = [];
  for (const [i, r] of rules.slice(0, 30).entries()) { const rule = normalizeRule(r, categories, i); if (!rule.text || ids.has(rule.id)) continue; ids.add(rule.id); out.push(rule); }
  return { version: VERSION, classify: { enabled: flag(input.classify?.enabled, true) }, rules: out, categories };
}
/** Junta uma alteração parcial: { toggle: {id, enabled} }, { rules }, { categories } ou { classify }. */
export function mergeConfig(current, patch = {}) {
  const now = normalizeConfig(current);
  const next = { ...now, rules: Array.isArray(patch.rules) ? patch.rules : now.rules, categories: Array.isArray(patch.categories) ? patch.categories : now.categories, classify: { ...now.classify, ...(patch.classify || {}) } };
  // Compatível com a tela anterior: { busy: { enabled } } liga/desliga a regra "Estou ocupada".
  const toggles = [patch.toggle, patch.busy && { id: 'busy', enabled: patch.busy.enabled }, patch.greeting && { id: 'greeting', enabled: patch.greeting.enabled }].filter(t => t && typeof t.enabled === 'boolean');
  next.rules = next.rules.map(r => { const t = toggles.find(t => t.id === r.id); return t ? { ...r, enabled: t.enabled } : r; });
  return normalizeConfig(next);
}
export const ruleById = (config, id) => config.rules.find(r => r.id === id);

/** Primeiro nome para {nome}. Telefones e nomes estranhos não entram na mensagem. */
export function firstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return /^[\p{L}][\p{L}'’-]{1,29}$/u.test(first) ? first[0].toUpperCase() + first.slice(1) : '';
}
/** Preenche {nome}. Sem nome, some também a vírgula ou o espaço antes dele ("Olá, {nome}!" → "Olá!"). */
export function renderTemplate(template, name) {
  const first = firstName(name);
  return String(template).replace(/[ \t]*,?[ \t]*\{nome\}/g, match => first ? match.replace('{nome}', first) : '').replace(/[ \t]{2,}/g, ' ').trim();
}

const GREETINGS = ['oi', 'oie', 'oii', 'oiii', 'ola', 'olaa', 'oi oi', 'e ai', 'eai', 'opa', 'ei', 'hey', 'hello', 'hi', 'alo', 'bom dia', 'boa tarde', 'boa noite', 'bom diaa', 'boa tardee', 'boa noitee',
  'tudo bem', 'tudo bom', 'td bem', 'tdb', 'tudo certo', 'como vai', 'como voce esta', 'como vc esta', 'blz', 'beleza', 'tranquilo', 'tudo joia', 'querida', 'amiga', 'moça', 'moca', 'flor', 'linda',
  'com voce', 'com vc', 'contigo', 'com licenca', 'licenca', 'por favor', 'obrigada', 'obrigado', 'bom', 'boa', 'e voce', 'e vc', 'gracas a deus', 'tudo otimo'];
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const GREETING_WORDS = GREETINGS.map(fold).sort((a, b) => b.length - a.length);
/** true quando as mensagens da cliente só cumprimentam (sem dizer o que precisa). */
export function isGreetingOnly(messages) {
  let rest = fold(messages.map(m => typeof m === 'string' ? m : m?.text || '').join(' '))
    .replace(/[\p{Extended_Pictographic}‍️]/gu, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rest) return true;
  for (const g of GREETING_WORDS) rest = (' ' + rest + ' ').replaceAll(' ' + g + ' ', ' ').replace(/\s+/g, ' ').trim();
  rest = rest.split(' ').filter(w => w && !/^(o+i+e*|ola+|e+i+|k{2,}|(ha){2,}|(he){2,}|(rs)+)$/.test(w)).join(' ');
  return !rest;
}
/** Alguma palavra-chave aparece nas mensagens (sem diferenciar acentos e maiúsculas). */
export function hasKeyword(messages, keywords) {
  const all = ' ' + fold(messages.join(' ')).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
  return keywords.some(k => { const w = fold(k).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); return w && all.includes(' ' + w + ' '); });
}
/** Dentro do horário de atendimento? Dia da semana (0 = domingo) e hora de Brasília. */
export function withinHours(at, hours) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at)).map(p => [p.type, p.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday), time = parts.hour + ':' + parts.minute;
  return hours.days.includes(day) && time >= hours.start && time < hours.end;
}
/** Prioridade final: a do assunto, ou a da IA quando o assunto está como "a IA decide". */
export function priorityFor(config, category, aiPriority) {
  const fixed = config.categories.find(c => c.name === category)?.priority;
  return fixed && fixed !== 'auto' ? fixed : ['alta', 'normal', 'baixa'].includes(aiPriority) ? aiPriority : 'normal';
}

/**
 * Qual regra cabe agora para uma conversa (ou nenhuma). ctx: { sent: {regra: quando}, manualReply (a profissional já
 * respondeu neste atendimento), texts (mensagens da cliente neste atendimento, ou só as posteriores à resposta dela),
 * first (primeiro atendimento deste contato) }. Regra pura, testada à parte.
 */
export function dueRule(thread, config, now = Date.now(), ctx = {}) {
  if (!thread || thread.resolved || thread.last_direction !== 'in' || !thread.last_inbound) return null;
  if (/spam/i.test(thread.ai_category || '')) return null;
  const quiet = now - Date.parse(thread.last_inbound), episode = thread.episode_at || thread.last_inbound, read = !!thread.ai_at && thread.ai_at >= thread.last_inbound;
  const subject = Number(thread.ai_intent) === 1 ? thread.ai_category : null;
  for (const rule of config.rules) {
    if (!rule.enabled || quiet < rule.delay * 1000) continue;
    if (ctx.manualReply && OPENING_TRIGGERS.includes(rule.trigger)) continue;
    // Depois da resposta da profissional, o assunto precisa ter sido lido de novo (mensagem nova da cliente).
    if (ctx.manualReply && rule.trigger === 'category' && !(ctx.replyAt && thread.ai_at && thread.ai_at > ctx.replyAt)) continue;
    const sent = ctx.sent?.[rule.id] || (rule.id === 'greeting' ? thread.auto_greeted : rule.id === 'busy' ? thread.auto_busy : null);
    if (sent && sent >= episode) continue;
    const ok = rule.trigger === 'greeting' ? read && Number(thread.ai_intent) === 0
      : rule.trigger === 'request' ? read && Number(thread.ai_intent) === 1
      : rule.trigger === 'category' ? read && subject === rule.category
      : rule.trigger === 'keywords' ? hasKeyword(ctx.texts || [], rule.keywords || [])
      : rule.trigger === 'away' ? !withinHours(thread.last_inbound, rule.hours)
      : rule.trigger === 'first' ? !!ctx.first : false;
    if (ok) return rule;
  }
  return null;
}
/** Compatibilidade: nome antigo da regra pura (boas-vindas/ocupada). */
export function dueAutomation(thread, config, now = Date.now(), manualReplyInEpisode = false) {
  const rule = dueRule(thread, normalizeConfig(config), now, { manualReply: manualReplyInEpisode });
  return rule?.trigger === 'greeting' ? 'greeting' : rule?.trigger === 'request' ? 'busy' : rule ? rule.id : null;
}

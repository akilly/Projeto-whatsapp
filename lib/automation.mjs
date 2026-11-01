/**
 * Automação do atendimento pelo WhatsApp (configurada no painel Automação).
 *
 * - Boas-vindas: quando a cliente só cumprimenta ("oi", "bom dia") e fica alguns minutos sem dizer o que quer,
 *   o sistema envia "Como posso ajudar?". Uma vez por atendimento.
 * - Estou ocupada: com o seletor ligado, depois que a cliente diz o que precisa, o sistema avisa que a resposta
 *   vem assim que possível. Uma vez por atendimento.
 * - Categorias: lista editável que a IA usa para separar as conversas por assunto.
 *
 * Um "atendimento" (episódio) começa quando a cliente escreve depois de GAP_HOURS sem conversa. Se a profissional
 * responder (pelo sistema ou pelo celular), a automação não envia mais nada naquele atendimento.
 */
export const GAP_HOURS = 8;
export const COLORS = ['purple', 'blue', 'green', 'orange', 'red', 'pink', 'teal', 'gray'];
export const DEFAULT_CATEGORIES = [
  { name: 'Segurança', color: 'red', description: 'Reação alérgica, ardência, queda de cabelo, queimadura, dor ou qualquer risco à saúde.' },
  { name: 'Agendamento urgente', color: 'orange', description: 'Quer horário para hoje ou amanhã.' },
  { name: 'Agendamento', color: 'blue', description: 'Quer marcar, remarcar, cancelar ou saber horários disponíveis.' },
  { name: 'Pós-procedimento', color: 'green', description: 'Dúvidas ou cuidados depois de um procedimento já feito.' },
  { name: 'Orçamento', color: 'purple', description: 'Quer saber preço ou pede avaliação de um serviço.' },
  { name: 'Informações gerais', color: 'teal', description: 'Endereço, horário de funcionamento, formas de pagamento e outras dúvidas.' },
  { name: 'Reclamação', color: 'red', description: 'Insatisfação com um serviço ou atendimento.' },
  { name: 'Exige esclarecimentos', color: 'pink', description: 'Mensagem confusa ou que precisa de mais detalhes para entender.' },
  { name: 'Spam ou suspeita', color: 'gray', description: 'Propaganda, golpe ou mensagem sem relação com o ateliê.' },
];
export const DEFAULT_CONFIG = Object.freeze({
  greeting: { enabled: true, delay: 120, text: 'Olá, {nome}! 😊 Como posso ajudar?' },
  busy: { enabled: false, delay: 30, text: 'Certo, no momento estou ocupada, assim que estiver disponível te envio uma mensagem. Agradecemos o contato, até breve.' },
  classify: { enabled: true },
  categories: DEFAULT_CATEGORIES,
});

const text = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, max);
const seconds = (value, fallback, min, max) => { const n = Math.round(Number(value)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; };
const flag = (value, fallback) => typeof value === 'boolean' ? value : fallback;

/** Valida e completa a configuração. Nunca devolve texto vazio para uma mensagem ligada. */
export function normalizeConfig(input = {}) {
  const base = DEFAULT_CONFIG, g = input.greeting || {}, b = input.busy || {};
  const categories = [];
  for (const c of Array.isArray(input.categories) ? input.categories.slice(0, 20) : base.categories) {
    const name = text(c?.name, 40);
    if (!name || categories.some(x => x.name.toLowerCase() === name.toLowerCase())) continue;
    categories.push({ name, color: COLORS.includes(c?.color) ? c.color : 'gray', description: text(c?.description, 200) });
  }
  return {
    greeting: { enabled: flag(g.enabled, base.greeting.enabled), delay: seconds(g.delay, base.greeting.delay, 15, 1800), text: text(g.text, 1000) || base.greeting.text },
    busy: { enabled: flag(b.enabled, base.busy.enabled), delay: seconds(b.delay, base.busy.delay, 0, 1800), text: text(b.text, 1000) || base.busy.text },
    classify: { enabled: flag(input.classify?.enabled, base.classify.enabled) },
    categories: categories.length ? categories : base.categories.map(c => ({ ...c })),
  };
}
/** Junta uma alteração parcial (ex.: só o seletor "estou ocupada") à configuração atual. */
export function mergeConfig(current, patch = {}) {
  const now = normalizeConfig(current);
  return normalizeConfig({
    greeting: { ...now.greeting, ...(patch.greeting || {}) },
    busy: { ...now.busy, ...(patch.busy || {}) },
    classify: { ...now.classify, ...(patch.classify || {}) },
    categories: Array.isArray(patch.categories) ? patch.categories : now.categories,
  });
}

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
  'tudo bem', 'tudo bom', 'td bem', 'tdb', 'tudo certo', 'como vai', 'como voce esta', 'como vc esta', 'blz', 'beleza', 'tranquilo', 'tudo joia', 'tudo jóia', 'querida', 'amiga', 'moça', 'moca', 'flor', 'linda',
  'com voce', 'com vc', 'contigo', 'com licenca', 'com licença', 'licenca', 'por favor', 'obrigada', 'obrigado', 'bom', 'boa', 'e voce', 'e vc', 'e com voce', 'graças a deus', 'gracas a deus', 'tudo otimo', 'tudo ótimo'];
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/**
 * true quando as mensagens da cliente só cumprimentam (sem dizer o que precisa). Usado quando a IA não está disponível
 * e como segunda opinião: uma saudação pura nunca dispara "estou ocupada".
 */
export function isGreetingOnly(messages) {
  let rest = fold(messages.map(m => typeof m === 'string' ? m : m?.text || '').join(' '))
    .replace(/[\p{Extended_Pictographic}‍️]/gu, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rest) return true;
  // Remove as saudações conhecidas (as mais longas primeiro) e vê se sobra algum pedido.
  for (const g of [...GREETINGS].map(fold).sort((a, b) => b.length - a.length)) rest = (' ' + rest + ' ').replaceAll(' ' + g + ' ', ' ').replace(/\s+/g, ' ').trim();
  // Letras repetidas ("oiiii", "olaaa") e risadas.
  rest = rest.split(' ').filter(w => w && !/^(o+i+e*|ola+|e+i+|k{2,}|(ha){2,}|(he){2,}|(rs)+)$/.test(w)).join(' ');
  return !rest;
}

/** Decide qual mensagem automática cabe agora para uma conversa (ou nenhuma). Regra pura, testada à parte. */
export function dueAutomation(thread, config, now = Date.now(), manualReplyInEpisode = false) {
  if (!thread || thread.resolved || thread.last_direction !== 'in' || !thread.last_inbound || manualReplyInEpisode) return null;
  if (!thread.ai_at || thread.ai_at < thread.last_inbound) return null; // espera a leitura da última mensagem
  if (/spam/i.test(thread.ai_category || '')) return null;
  const quiet = now - Date.parse(thread.last_inbound), episode = thread.episode_at || thread.last_inbound;
  const already = at => !!at && at >= episode;
  if (Number(thread.ai_intent) === 0) return config.greeting.enabled && !already(thread.auto_greeted) && quiet >= config.greeting.delay * 1000 ? 'greeting' : null;
  if (Number(thread.ai_intent) === 1) return config.busy.enabled && !already(thread.auto_busy) && quiet >= config.busy.delay * 1000 ? 'busy' : null;
  return null;
}

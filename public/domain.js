/**
 * Regras de negócio compartilhadas entre navegador e API (versão essencial).
 * Áreas: serviços (catálogo), atendimentos (notas internas), orçamentos, tarefas e estoque.
 * Não há cadastro de clientes: cada registro guarda o contato (nome e telefone) e, se houver, a origem
 * (conversa do WhatsApp ou nota interna). Quantidades com três casas; null em custo significa informação pendente, nunca zero.
 * Referências: docs/DOCUMENTACAO_TECNICA.md.
 */
import { deletionBlock, removableCollections } from './deletion.js';
import { localDate } from './core.js';

/** Versão do formato salvo. */
export const SCHEMA = 3;
/** Coleções do estado, na ordem em que são validadas. */
export const COLLECTIONS = ['services', 'conversations', 'quotes', 'tasks', 'products', 'movements'];

export const cents = n => Math.round(Number(n) * 100), amount = n => n / 100, qty = n => Math.round(Number(n) * 1000) / 1000;

/** Situações do orçamento. */
export const QUOTE_STATUS = { missing: 'Faltam informações', review: 'Em avaliação', approved: 'Avaliado', closed: 'Encerrado' };
/** Situações da nota interna de atendimento. */
export const CONVERSATION_STATUS = ['open', 'waiting', 'resolved'];
export const PRIORITIES = ['Alta', 'Média', 'Baixa'];
export const TASK_AREAS = ['Atendimento', 'Orçamento', 'Estoque', 'Serviços', 'Operação'];
/** Movimentos de estoque: entradas (opening, purchase), saídas (use, loss) e conferência de custo (valuation). */
export const MOVEMENT_TYPES = { opening: 'Estoque inicial', purchase: 'Compra', use: 'Uso', loss: 'Perda', valuation: 'Custo conferido' };
export const OUTFLOWS = ['use', 'loss'];

/** Catálogo inicial editável. */
export function defaultServices() {
    return [
        { id: 's1', name: 'Corte & finalização', duration: 60, description: 'Corte personalizado com lavagem e finalização.', products: 'Shampoo e condicionador profissionais', before: 'Compartilhar referências do corte desejado.', after: 'Manter os cuidados combinados com a profissional.' },
        { id: 's2', name: 'Coloração', duration: 120, description: 'Cor personalizada, com avaliação prévia do histórico capilar.', products: 'Coloração e oxidante definidos na avaliação', before: 'Informar procedimentos químicos anteriores.', after: 'Seguir as orientações individuais combinadas.' },
        { id: 's3', name: 'Mechas & iluminação', duration: 180, description: 'Iluminação e tonalização definidas após avaliação profissional.', products: 'Produtos definidos na avaliação', before: 'Trazer referências e histórico de procedimentos.', after: 'Seguir a rotina de cuidados orientada no atendimento.' },
        { id: 's4', name: 'Tratamento capilar', duration: 60, description: 'Ritual de cuidado escolhido conforme avaliação profissional.', products: 'Máscara profissional', before: 'Informar sensibilidades conhecidas.', after: 'Seguir os cuidados indicados pela profissional.' },
        { id: 's5', name: 'Escova & styling', duration: 45, description: 'Lavagem, escova e acabamento personalizado.', products: 'Protetor térmico', before: 'Compartilhar o acabamento desejado.', after: 'Evitar umidade imediatamente após a finalização.' }
    ];
}

/** Estado vazio de uma conta nova; traz apenas o catálogo sugerido de serviços. */
export function blankState() {
    return { schema: SCHEMA, focus: false, settings: { name: 'Hanne', responseMinutes: 60 }, services: defaultServices(), conversations: [], quotes: [], tasks: [], products: [], movements: [], audit: [] };
}

/** Somente dígitos do telefone. */
export const phoneDigits = phone => String(phone || '').replace(/\D/g, '');

/** Contato válido: nome obrigatório (até 100), telefone opcional com 10 a 15 dígitos. */
export function contactIssue(contact, { required = true } = {}) {
    if (contact === null || contact === undefined) return required ? 'Informe o nome do contato.' : '';
    if (typeof contact !== 'object') return 'Contato inválido.';
    const name = typeof contact.name === 'string' ? contact.name.trim() : '', phone = typeof contact.phone === 'string' ? contact.phone : '';
    if (!name) return required || phone ? 'Informe o nome do contato.' : '';
    if (name.length > 100 || phone.length > 30) return 'Contato muito longo.';
    const digits = phoneDigits(phone);
    if (phone && (digits.length < 10 || digits.length > 15)) return 'Confira o telefone do contato, com DDD.';
    return '';
}

/** Monta o contato a partir de campos de formulário (vazio vira null). */
export function makeContact(name, phone) {
    const n = String(name || '').trim(), p = String(phone || '').trim();
    return n || p ? { name: n, phone: p } : null;
}

/** Origem do registro: conversa do WhatsApp (id da conversa no canal) ou nota interna (id em conversations). */
export function originIssue(origin, s) {
    if (origin === null || origin === undefined) return '';
    if (typeof origin !== 'object' || !['whatsapp', 'note'].includes(origin.type) || typeof origin.id !== 'string' || !origin.id || origin.id.length > 200) return 'Origem inválida.';
    if (origin.type === 'note' && !s.conversations.some(c => c.id === origin.id)) return 'A nota de atendimento de origem não existe mais.';
    return '';
}

/** Lista de contatos conhecidos (das notas, orçamentos e tarefas), sem repetir telefone ou nome. */
export function knownContacts(s, extra = []) {
    const seen = new Map();
    const add = c => {
        if (!c?.name?.trim()) return;
        const key = phoneDigits(c.phone).slice(-11) || c.name.trim().toLocaleLowerCase('pt-BR');
        if (!seen.has(key)) seen.set(key, { name: c.name.trim(), phone: c.phone || '' });
    };
    extra.forEach(add);
    for (const k of ['conversations', 'quotes', 'tasks']) for (const x of s[k] || []) add(x.contact);
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Registros ligados a um contato (mesmo telefone ou, sem telefone, mesmo nome). */
export function sameContact(a, b) {
    if (!a || !b) return false;
    const da = phoneDigits(a.phone).slice(-11), db = phoneDigits(b.phone).slice(-11);
    if (da && db) return da === db;
    return String(a.name || '').trim().toLocaleLowerCase('pt-BR') === String(b.name || '').trim().toLocaleLowerCase('pt-BR');
}

/**
 * stockOf — Reconstitui saldo e custo médio ponderado na ordem dos movimentos. Custo desconhecido permanece null
 * até uma conferência de custo ou até o estoque zerar e receber uma entrada com custo.
 */
export function stockOf(state, id) {
    let quantity = 0, unitCost = null;
    for (const m of state.movements.filter(x => x.productId === id)) {
        if (m.type === 'valuation') { unitCost = m.unitCost; continue; }
        if (m.quantity > 0) {
            if (quantity === 0) unitCost = m.unitCost;
            else if (unitCost !== null && m.unitCost !== null) unitCost = (quantity * unitCost + m.quantity * m.unitCost) / (quantity + m.quantity);
            else unitCost = null;
        }
        quantity = qty(quantity + m.quantity);
        if (quantity === 0) unitCost = null;
    }
    return { quantity, unitCost };
}

/**
 * recost — Recalcula, em ordem, o custo médio registrado em cada saída (uso e perda) a partir das entradas.
 * Usado depois de corrigir ou excluir movimentos; lança erro se o saldo ficar negativo.
 */
export function recost(state) {
    const stocks = new Map();
    for (const m of state.movements) {
        const old = stocks.get(m.productId) || { q: 0, c: null };
        if (OUTFLOWS.includes(m.type)) m.unitCost = old.c;
        let c = old.c;
        if (m.type === 'valuation') c = m.unitCost;
        else if (m.quantity > 0) c = old.q === 0 ? m.unitCost : old.c === null || m.unitCost === null ? null : (old.q * old.c + m.quantity * m.unitCost) / (old.q + m.quantity);
        const q = Math.round((old.q + m.quantity) * 1000000) / 1000000;
        if (q < 0) throw Error('O estoque ficaria negativo. Confira as saídas registradas depois deste movimento.');
        stocks.set(m.productId, { q, c: q === 0 && m.type !== 'valuation' ? null : c });
    }
    return state;
}

/** Produtos com saldo igual ou abaixo do mínimo. */
export const lowStock = s => s.products.filter(p => stockOf(s, p.id).quantity <= p.minimum);

/**
 * stockEntry — Cria um movimento de estoque numa cópia do estado (entrada, uso, perda ou conferência de custo).
 * Compras não geram despesa: esta versão não tem financeiro.
 */
export function stockEntry(state, { id, productId, type, date, quantity = 0, total = null, unitCost = null, note = '' }) {
    const next = structuredClone(state), p = next.products.find(p => p.id === productId);
    if (!p) throw Error('Produto não encontrado.');
    if (!MOVEMENT_TYPES[type] || type === 'opening') throw Error('Tipo de movimento inválido.');
    const last = next.movements.filter(m => m.productId === productId).at(-1);
    if (last && date < last.date) throw Error(`Use a data do último movimento de ${p.name} (${last.date}) ou uma data posterior.`);
    if (date > localDate()) throw Error('Use uma data até hoje.');
    const st = stockOf(next, productId), q = qty(quantity);
    let move;
    if (type === 'purchase') {
        if (!(q > 0)) throw Error('Informe a quantidade comprada.');
        if (p.unit === 'un' && !Number.isInteger(q)) throw Error('Informe uma quantidade inteira em unidades.');
        const cost = total === null || total === '' ? null : Number(total);
        if (cost !== null && !(cost > 0)) throw Error('Informe o valor da compra ou deixe em branco.');
        move = { id, productId, type, date, quantity: q, unitCost: cost === null ? null : cost / q, total: cost === null ? null : amount(cents(cost)), note };
    }
    else if (OUTFLOWS.includes(type)) {
        if (!(q > 0) || q > st.quantity) throw Error('A saída deve ser positiva e caber no saldo disponível.');
        if (p.unit === 'un' && !Number.isInteger(q)) throw Error('Use quantidade inteira para unidades.');
        move = { id, productId, type, date, quantity: -q, unitCost: st.unitCost, note };
    }
    else {
        const cost = Number(unitCost);
        if (!(cost > 0)) throw Error('Informe o custo conferido.');
        move = { id, productId, type, date, quantity: 0, unitCost: cost, note };
    }
    next.movements.push(move);
    return next;
}

/**
 * validateState — Valida estrutura, referências, contatos, estoque cronológico e regras de exclusão.
 * Lança erro no primeiro problema; usada no navegador e no servidor.
 */
export function validateState(s, previous = null) {
    const fail = t => { throw Error(t); };
    if (!s || s.schema !== SCHEMA) fail('Formato incompatível.');
    for (const k of COLLECTIONS) {
        if (!Array.isArray(s[k]) || s[k].length > 10000) fail('Limite ou formato inválido: ' + k);
        const ids = new Set();
        for (const x of s[k]) {
            if (!x || typeof x.id !== 'string' || !x.id || x.id.length > 100 || ids.has(x.id)) fail('Identificador inválido ou duplicado.');
            ids.add(x.id);
        }
    }
    if (s.audit !== undefined && !Array.isArray(s.audit)) fail('Histórico inválido.');
    const has = (k, id) => s[k].some(x => x.id === id), positive = n => Number.isFinite(n) && n > 0 && n <= 10000000, nonnegative = n => Number.isFinite(n) && n >= 0 && n <= 10000000;
    const date = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T12:00:00Z')) && new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d;
    const text = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.length <= max);
    if (!s.settings || typeof s.settings.name !== 'string' || !s.settings.name.trim() || s.settings.name.length > 100) fail('Configurações inválidas.');
    if (s.settings.responseMinutes !== undefined && (!Number.isInteger(s.settings.responseMinutes) || s.settings.responseMinutes < 5 || s.settings.responseMinutes > 1440)) fail('Prazo de resposta inválido.');
    for (const x of s.services)
        if (!x.name?.trim() || x.name.length > 120 || !positive(x.duration) || x.duration > 600 || !text(x.description, 2000) || !text(x.products, 2000) || !text(x.before, 2000) || !text(x.after, 2000) || (x.price !== undefined && x.price !== null && !positive(x.price))) fail('Serviço inválido.');
    for (const v of s.conversations) {
        const issue = contactIssue(v.contact);
        if (issue) fail(issue);
        if (!CONVERSATION_STATUS.includes(v.status) || typeof v.category !== 'string' || v.category.length > 60 || !Array.isArray(v.messages) || v.messages.length > 500 || v.messages.some(m => !m || typeof m.text !== 'string' || m.text.length > 4000 || !['incoming', 'note'].includes(m.type)) || !text(v.summary, 2000) || !text(v.draft, 4000)) fail('Nota de atendimento inválida.');
    }
    for (const q of s.quotes) {
        const issue = contactIssue(q.contact) || originIssue(q.origin, s);
        if (issue) fail(issue);
        if (!QUOTE_STATUS[q.status] || !date(q.date) || (q.serviceId !== null && q.serviceId !== undefined && !has('services', q.serviceId)) || !text(q.serviceName, 120) || (q.value !== null && !positive(q.value)) || !text(q.notes, 3000) || !text(q.question, 3000)) fail('Orçamento inválido.');
        if (q.status === 'approved' && q.value === null) fail('Defina o valor antes de marcar o orçamento como avaliado.');
        if (!Array.isArray(q.photos) || q.photos.length > 3 || q.photos.some(p => typeof p !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(p) || p.length > 700000)) fail('Fotos do orçamento inválidas.');
    }
    for (const t of s.tasks) {
        const issue = contactIssue(t.contact, { required: false }) || originIssue(t.origin, s);
        if (issue) fail(issue);
        if (!t.title?.trim() || t.title.length > 180 || !PRIORITIES.includes(t.priority) || typeof t.area !== 'string' || t.area.length > 40 || !date(t.due) || typeof t.done !== 'boolean' || (t.quoteId && !has('quotes', t.quoteId))) fail('Tarefa inválida.');
    }
    for (const p of s.products)
        if (!p.name?.trim() || p.name.length > 120 || !text(p.brand, 80) || !['g', 'ml', 'un'].includes(p.unit) || !positive(p.packageSize) || !nonnegative(p.minimum)) fail('Produto inválido.');
    // Reproduz o livro de estoque em ordem e confere o custo de cada saída.
    const stocks = new Map(), dates = new Map(), costs = new Map();
    for (const m of s.movements) {
        if (!has('products', m.productId) || !date(m.date) || !Number.isFinite(m.quantity) || Math.abs(m.quantity) > 10000000 || !MOVEMENT_TYPES[m.type] || (m.unitCost !== null && !nonnegative(m.unitCost)) || !text(m.note, 500)) fail('Movimento inválido.');
        if (m.date > localDate()) fail('Movimento com data futura.');
        if (dates.has(m.productId) && m.date < dates.get(m.productId)) fail('Estoque fora da ordem cronológica.');
        dates.set(m.productId, m.date);
        if (OUTFLOWS.includes(m.type) && m.quantity >= 0) fail('Saída inválida.');
        if (['opening', 'purchase'].includes(m.type) && (m.quantity < 0 || (m.type === 'purchase' && m.quantity === 0))) fail('Entrada inválida.');
        if (m.type === 'valuation' && (m.quantity !== 0 || m.unitCost === null)) fail('Conferência de custo inválida.');
        const before = stocks.get(m.productId) || 0, priorCost = costs.get(m.productId) ?? null;
        if (OUTFLOWS.includes(m.type) && (m.unitCost === null ? priorCost !== null : priorCost === null || Math.abs(m.unitCost - priorCost) > 0.00000001)) fail('O custo do movimento não corresponde ao estoque.');
        let nextCost = priorCost;
        if (m.type === 'valuation') nextCost = m.unitCost;
        else if (m.quantity > 0) nextCost = before === 0 ? m.unitCost : priorCost === null || m.unitCost === null ? null : (before * priorCost + m.quantity * m.unitCost) / (before + m.quantity);
        const after = qty(before + m.quantity);
        if (after === 0 && m.type !== 'valuation') nextCost = null;
        if (after < 0) fail('Estoque negativo.');
        costs.set(m.productId, nextCost);
        stocks.set(m.productId, after);
    }
    if (previous) {
        // Cadastros só somem pela exclusão confirmada (servidor) ou quando não têm vínculos.
        for (const collection of removableCollections) for (const old of previous[collection] || [])
            if (!s[collection].some(x => x.id === old.id)) { const issue = deletionBlock(previous, collection, old.id); if (issue) fail(issue); }
        for (const old of previous.movements || []) {
            const fresh = s.movements.find(x => x.id === old.id);
            if (!fresh) fail('Movimentos de estoque só podem ser excluídos pela exclusão confirmada.');
            if (old.productId !== fresh.productId || old.type !== fresh.type) fail('Produto e tipo do movimento não podem ser alterados. Exclua e registre de novo.');
        }
    }
    return s;
}

/** Destinos de consulta. A URL transporta páginas, abas, filtros e IDs, nunca nomes ou telefones. */
const pages = ['dashboard', 'conversations', 'inventory', 'services', 'quotes', 'tasks', 'settings'];
const keys = ['page', 'tab', 'scope', 'product', 'quote', 'task', 'service', 'p'];

/** URL interna compatível com nova aba, atualização da página e histórico do navegador. */
export function destinationHref(target) {
    const params = new URLSearchParams();
    for (const key of keys) if (target[key] !== undefined && target[key] !== null && target[key] !== '') params.set(key, String(target[key]));
    return '#' + params.toString();
}

/** Lê apenas destinos conhecidos; filtros inválidos não ampliam a consulta por acidente. */
export function parseDestination(hash = '') {
    const params = new URLSearchParams(hash.replace(/^#/, '')), target = {};
    if (!pages.includes(params.get('page'))) return null;
    for (const key of keys) if (params.has(key)) target[key] = params.get(key).slice(0, 250);
    target.p = Math.max(1, Math.min(10000, Math.trunc(Number(target.p)) || 1));
    return target;
}

/** Datas de negócio são datas civis de Brasília; não são instantes convertidos de UTC. */
export function validCalendarDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
}

/** Paginação sobre a lista completa; nunca simula um total de uma resposta parcial. */
export function recordPage(records, requested = 1, size = 10) {
    const pages = Math.max(1, Math.ceil(records.length / size)), page = Math.max(1, Math.min(pages, Math.trunc(Number(requested)) || 1)), start = (page - 1) * size;
    return { page, pages, total: records.length, start: records.length ? start + 1 : 0, end: Math.min(start + size, records.length), rows: records.slice(start, start + size) };
}

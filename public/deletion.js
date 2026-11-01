/**
 * Exclusão de registros (versão essencial). O plano mostra tudo o que será apagado ou desvinculado antes da confirmação;
 * o servidor recalcula o mesmo plano e só grava se ele coincidir com o que a pessoa conferiu.
 */
import { recost } from './domain.js';

/** Coleções que podem ser apagadas numa gravação normal, quando não têm vínculos. */
export const removableCollections = ['services', 'conversations', 'quotes', 'tasks', 'products'];
/** Todas as coleções alcançáveis pela exclusão confirmada. */
export const allCollections = [...removableCollections, 'movements', 'audit'];

// Vínculos fortes: apagar o pai apaga o filho (movimentos sem produto não fazem sentido).
const cascade = { movements: { productId: 'products' } };
// Vínculos fracos: apagar o pai apenas limpa a referência no filho.
const unlink = [
    { collection: 'quotes', key: 'serviceId', parent: 'services' },
    { collection: 'quotes', origin: 'note', parent: 'conversations' },
    { collection: 'tasks', origin: 'note', parent: 'conversations' },
    { collection: 'tasks', key: 'quoteId', parent: 'quotes' }
];

/** Motivo que impede a exclusão numa gravação comum (sem o plano confirmado); vazio quando é permitida. */
export function deletionBlock(state, collection, id) {
    if (!removableCollections.includes(collection)) return 'Este registro só pode ser apagado pela exclusão confirmada.';
    if (!state[collection]?.some(x => x.id === id)) return 'Registro não encontrado.';
    if (collection === 'products' && state.movements.some(m => m.productId === id)) return 'O produto tem movimentos de estoque. Use a exclusão confirmada.';
    for (const link of unlink) if (link.parent === collection && state[link.collection].some(x => link.key ? x[link.key] === id : x.origin?.type === link.origin && x.origin.id === id)) return 'Existe vínculo com outro registro. Use a exclusão confirmada para conferir o que muda.';
    return '';
}

const labelOf = x => x.name || x.title || x.contact?.name || x.action || x.date || x.id;

/** Plano explícito de exclusão: { next, entries } — entries lista apagados e desvinculados. */
export function deletionPlan(state, collection, id) {
    if (collection === 'operation' && id === 'all') {
        const next = structuredClone(state), entries = allCollections.flatMap(k => state[k].map(x => ({ collection: k, id: x.id, label: labelOf(x) })));
        for (const k of allCollections) next[k] = [];
        next.focus = false;
        next.settings = { name: 'Hanne', responseMinutes: 60 };
        entries.push({ collection: 'settings', id: 'settings', label: 'Configurações' });
        return { next, entries };
    }
    if (!allCollections.includes(collection) || !state[collection]?.some(x => x.id === id)) throw Error('Registro não encontrado.');
    const removed = new Map(allCollections.map(k => [k, new Set()]));
    removed.get(collection).add(id);
    let changed = true;
    while (changed) {
        changed = false;
        const add = (k, itemId) => { if (!removed.get(k).has(itemId)) { removed.get(k).add(itemId); changed = true; } };
        for (const [child, keys] of Object.entries(cascade)) for (const x of state[child]) for (const [key, parent] of Object.entries(keys)) if (removed.get(parent).has(x[key])) add(child, x.id);
        // Retirar uma entrada muda o custo de tudo o que vem depois no mesmo produto.
        for (const m of state.movements) if (removed.get('movements').has(m.id) && (m.quantity > 0 || m.type === 'valuation'))
            for (const later of state.movements.slice(state.movements.indexOf(m) + 1)) if (later.productId === m.productId) add('movements', later.id);
    }
    const next = structuredClone(state), entries = [];
    for (const k of allCollections) {
        next[k] = next[k].filter(x => !removed.get(k).has(x.id));
        for (const x of state[k]) if (removed.get(k).has(x.id)) entries.push({ collection: k, id: x.id, label: labelOf(x) });
    }
    for (const link of unlink) for (const x of next[link.collection]) {
        const hit = link.key ? x[link.key] && removed.get(link.parent).has(x[link.key]) : x.origin?.type === link.origin && removed.get(link.parent).has(x.origin.id);
        if (!hit) continue;
        if (link.key === 'serviceId') { const s = state.services.find(s => s.id === x.serviceId); x.serviceName = x.serviceName || s?.name || ''; x.serviceId = null; }
        else if (link.key) x[link.key] = null;
        else x.origin = null;
        entries.push({ collection: link.collection, id: x.id, label: labelOf(x), unlinked: true });
    }
    // Recalcula o custo médio registrado nas saídas que permaneceram.
    try { recost(next); } catch { throw Error('A exclusão deixaria o estoque negativo. Exclua antes as saídas posteriores.'); }
    return { next, entries };
}

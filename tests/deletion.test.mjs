/** Exclusão: vínculos fracos são desfeitos, movimentos acompanham o produto e o custo é recalculado. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { blankState, validateState, stockEntry, stockOf } from '../public/domain.js';
import { deletionBlock, deletionPlan } from '../public/deletion.js';
import { exampleState } from '../public/examples.js';
import { localDate, dayOffset } from '../public/core.js';

test('gravação comum não remove produto com movimentos nem serviço usado em orçamento', () => {
    const s = exampleState();
    assert.match(deletionBlock(s, 'products', 'ex-shampoo'), /movimentos/);
    assert.match(deletionBlock(s, 'services', 's3'), /vínculo/);
    const next = structuredClone(s); next.services = next.services.filter(x => x.id !== 's3');
    assert.throws(() => validateState(next, s), /vínculo|inválido/);
    assert.equal(deletionBlock(s, 'services', 's4'), '');
});

test('excluir serviço mantém o orçamento com o nome do serviço', () => {
    const s = exampleState(), plan = deletionPlan(s, 'services', 's3');
    const q = plan.next.quotes.find(q => q.id === 'q1');
    assert.equal(q.serviceId, null);
    assert.equal(q.serviceName, 'Mechas & iluminação');
    assert.ok(plan.entries.some(e => e.unlinked && e.id === 'q1'));
    assert.doesNotThrow(() => validateState(plan.next));
});

test('excluir nota de atendimento desfaz a origem de orçamentos e tarefas', () => {
    const s = exampleState(), plan = deletionPlan(s, 'conversations', 'v2');
    assert.equal(plan.next.quotes.find(q => q.id === 'q1').origin, null);
    assert.equal(plan.next.quotes.length, s.quotes.length);
    assert.doesNotThrow(() => validateState(plan.next));
});

test('excluir orçamento limpa o vínculo da tarefa', () => {
    const s = exampleState(), plan = deletionPlan(s, 'quotes', 'q1');
    assert.equal(plan.next.tasks.find(t => t.id === 't2').quoteId, null);
    assert.doesNotThrow(() => validateState(plan.next));
});

test('excluir produto leva todos os movimentos; excluir entrada leva os posteriores', () => {
    const s = exampleState();
    const product = deletionPlan(s, 'products', 'ex-color');
    assert.equal(product.next.movements.filter(m => m.productId === 'ex-color').length, 0);
    const entry = deletionPlan(s, 'movements', 'ex-buy-color');
    assert.deepEqual(entry.entries.map(e => e.id).sort(), ['ex-buy-color', 'ex-use-color']);
    assert.doesNotThrow(() => validateState(entry.next));
});

test('excluir uma saída recalcula o custo das saídas restantes', () => {
    const d = n => dayOffset(n, localDate());
    let s = blankState();
    s.products.push({ id: 'p', name: 'P', unit: 'g', packageSize: 100, minimum: 0 });
    s.movements.push({ id: 'o', productId: 'p', type: 'opening', date: d(-5), quantity: 100, unitCost: 1, note: '' });
    s = stockEntry(s, { id: 'u1', productId: 'p', type: 'use', date: d(-4), quantity: 10 });
    s = stockEntry(s, { id: 'u2', productId: 'p', type: 'use', date: d(-3), quantity: 10 });
    const plan = deletionPlan(s, 'movements', 'u1');
    assert.equal(stockOf(plan.next, 'p').quantity, 90);
    assert.doesNotThrow(() => validateState(plan.next));
});

test('apagar todos os dados zera as coleções', () => {
    const plan = deletionPlan(exampleState(), 'operation', 'all');
    for (const k of ['services', 'conversations', 'quotes', 'tasks', 'products', 'movements']) assert.equal(plan.next[k].length, 0);
    assert.doesNotThrow(() => validateState({ ...plan.next, datasetKind: undefined }));
});

test('montar o plano não altera o estado original (o servidor recalcula o mesmo plano)', () => {
    const s = exampleState(), before = JSON.stringify(s);
    const first = JSON.stringify(deletionPlan(s, 'services', 's3').entries);
    deletionPlan(s, 'movements', 'ex-color-initial');
    assert.equal(JSON.stringify(s), before);
    assert.equal(JSON.stringify(deletionPlan(s, 'services', 's3').entries), first);
});

/** Regras da versão essencial: contatos sem cadastro, orçamentos, tarefas e livro de estoque. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { blankState, validateState, stockOf, stockEntry, recost, contactIssue, makeContact, knownContacts, sameContact, lowStock, SCHEMA } from '../public/domain.js';
import { localDate, dayOffset } from '../public/core.js';

const today = localDate(), d = n => dayOffset(n, today);
const withProduct = () => { const s = blankState(); s.products.push({ id: 'p', name: 'Máscara', unit: 'g', packageSize: 1000, minimum: 100 }); s.movements.push({ id: 'o', productId: 'p', type: 'opening', date: d(-10), quantity: 500, unitCost: 0.1, note: '' }); return s; };

test('estado vazio não tem clientes, agenda nem financeiro e é válido', () => {
    const s = blankState();
    assert.equal(s.schema, SCHEMA);
    for (const k of ['clients', 'appointments', 'records', 'bills', 'payments', 'expenses']) assert.equal(s[k], undefined);
    assert.ok(s.services.length > 0);
    assert.doesNotThrow(() => validateState(s));
});

test('contato exige nome e aceita telefone opcional com DDD', () => {
    assert.equal(contactIssue(makeContact('Ana', '')), '');
    assert.equal(contactIssue(makeContact('Ana', '(41) 99999-0000')), '');
    assert.match(contactIssue(makeContact('Ana', '1234')), /telefone/);
    assert.match(contactIssue(makeContact('', '(41) 99999-0000')), /nome/);
    assert.match(contactIssue(null), /nome/);
    assert.equal(contactIssue(null, { required: false }), '');
});

test('orçamento guarda contato e origem; avaliado exige valor', () => {
    const s = blankState();
    s.conversations.push({ id: 'v', contact: { name: 'Ana', phone: '' }, category: 'Orçamento', status: 'open', messages: [], summary: '', draft: '' });
    s.quotes.push({ id: 'q', contact: { name: 'Ana', phone: '' }, origin: { type: 'note', id: 'v' }, serviceId: 's1', status: 'review', value: null, date: today, notes: '', question: '', photos: [] });
    assert.doesNotThrow(() => validateState(s));
    s.quotes[0].status = 'approved';
    assert.throws(() => validateState(s), /valor/);
    s.quotes[0].value = 200;
    s.quotes[0].origin = { type: 'note', id: 'inexistente' };
    assert.throws(() => validateState(s), /origem/);
    s.quotes[0].origin = { type: 'whatsapp', id: 'thread-1' };
    assert.doesNotThrow(() => validateState(s));
});

test('tarefa aceita ficar sem contato e recusa orçamento inexistente', () => {
    const s = blankState();
    s.tasks.push({ id: 't', title: 'Repor estoque', area: 'Estoque', priority: 'Média', due: today, done: false, contact: null, origin: null });
    assert.doesNotThrow(() => validateState(s));
    s.tasks[0].quoteId = 'nada';
    assert.throws(() => validateState(s), /Tarefa/);
});

test('entrada, uso e perda atualizam saldo e custo médio, sem despesa', () => {
    let s = withProduct();
    s = stockEntry(s, { id: 'c', productId: 'p', type: 'purchase', date: d(-5), quantity: 500, total: 100 });
    assert.deepEqual(stockOf(s, 'p'), { quantity: 1000, unitCost: 0.15 });
    s = stockEntry(s, { id: 'u', productId: 'p', type: 'use', date: d(-4), quantity: 200 });
    s = stockEntry(s, { id: 'l', productId: 'p', type: 'loss', date: d(-3), quantity: 50 });
    assert.equal(stockOf(s, 'p').quantity, 750);
    assert.equal(s.movements.find(m => m.id === 'u').unitCost, 0.15);
    assert.equal(s.expenses, undefined);
    assert.doesNotThrow(() => validateState(s));
    assert.throws(() => stockEntry(s, { id: 'x', productId: 'p', type: 'use', date: d(-2), quantity: 9999 }), /saldo/);
    assert.throws(() => stockEntry(s, { id: 'x', productId: 'p', type: 'use', date: d(-9), quantity: 1 }), /último movimento/);
});

test('entrada sem valor deixa o custo a conferir até a conferência', () => {
    let s = withProduct();
    s = stockEntry(s, { id: 'c', productId: 'p', type: 'purchase', date: d(-5), quantity: 100, total: null });
    assert.equal(stockOf(s, 'p').unitCost, null);
    s = stockEntry(s, { id: 'v', productId: 'p', type: 'valuation', date: d(-4), unitCost: 0.2 });
    assert.equal(stockOf(s, 'p').unitCost, 0.2);
    assert.doesNotThrow(() => validateState(s));
});

test('corrigir uma entrada recalcula o custo das saídas seguintes', () => {
    let s = withProduct();
    s = stockEntry(s, { id: 'c', productId: 'p', type: 'purchase', date: d(-5), quantity: 500, total: 100 });
    s = stockEntry(s, { id: 'u', productId: 'p', type: 'use', date: d(-4), quantity: 100 });
    s.movements.find(m => m.id === 'c').unitCost = 0.3;
    assert.throws(() => validateState(s), /custo/);
    recost(s);
    assert.equal(s.movements.find(m => m.id === 'u').unitCost, 0.2);
    assert.doesNotThrow(() => validateState(s));
});

test('estoque negativo, data futura e fora de ordem são recusados', () => {
    const s = withProduct();
    s.movements.push({ id: 'x', productId: 'p', type: 'use', date: d(-1), quantity: -600, unitCost: 0.1 });
    assert.throws(() => validateState(s), /negativo/);
    s.movements.pop();
    s.movements.push({ id: 'x', productId: 'p', type: 'use', date: d(-20), quantity: -1, unitCost: 0.1 });
    assert.throws(() => validateState(s), /ordem/);
    s.movements.pop();
    s.movements.push({ id: 'x', productId: 'p', type: 'purchase', date: d(3), quantity: 1, unitCost: 0.1 });
    assert.throws(() => validateState(s), /futura/);
});

test('movimento não some numa gravação comum', () => {
    const before = withProduct(), after = structuredClone(before);
    after.movements = [];
    assert.throws(() => validateState(after, before), /exclusão confirmada|movimentos/i);
});

test('lista de contatos junta registros sem repetir o telefone', () => {
    const s = blankState();
    s.conversations.push({ id: 'v', contact: { name: 'Ana Souza', phone: '(41) 99999-0000' }, category: 'x', status: 'open', messages: [] });
    s.quotes.push({ id: 'q', contact: { name: 'Ana', phone: '41999990000' }, origin: null, serviceId: null, status: 'review', value: null, date: today, photos: [] });
    const list = knownContacts(s, [{ name: 'Bia', phone: '5541988887777' }]);
    assert.deepEqual(list.map(c => c.name), ['Ana Souza', 'Bia']);
    assert.ok(sameContact({ name: 'x', phone: '+55 (41) 99999-0000' }, { name: 'y', phone: '41999990000' }));
});

test('estoque baixo considera o mínimo', () => {
    const s = withProduct();
    assert.equal(lowStock(s).length, 0);
    s.products[0].minimum = 500;
    assert.equal(lowStock(s).length, 1);
});

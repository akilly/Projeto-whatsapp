/** Destinos internos: só páginas conhecidas e filtros simples; paginação sobre a lista completa. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationHref, parseDestination, recordPage, validCalendarDate } from '../public/navigation.js';

test('URL leva página, aba e filtro e volta igual', () => {
    const href = destinationHref({ page: 'inventory', tab: 'movements', scope: 'low', p: 2 });
    assert.deepEqual(parseDestination(href), { page: 'inventory', tab: 'movements', scope: 'low', p: 2 });
});
test('páginas removidas (agenda, clientes, financeiro) não abrem', () => {
    for (const page of ['agenda', 'clients', 'finance', 'setup']) assert.equal(parseDestination('#page=' + page), null);
    assert.ok(parseDestination('#page=quotes'));
});
test('paginação limita a página e informa o intervalo', () => {
    const page = recordPage(Array.from({ length: 23 }, (_, i) => i), 9);
    assert.equal(page.page, 3); assert.equal(page.start, 21); assert.equal(page.end, 23);
});
test('datas civis válidas', () => { assert.ok(validCalendarDate('2026-02-28')); assert.ok(!validCalendarDate('2026-02-30')); });

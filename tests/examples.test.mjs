/** Testes de consistência das fixtures da demonstração. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleState } from '../public/examples.js';
import { validateState, stockOf, lowStock } from '../public/domain.js';

test('demonstração é válida, identificada e cobre as áreas da versão essencial', () => {
    const s = exampleState();
    assert.equal(s.datasetKind, 'example');
    assert.doesNotThrow(() => validateState(s));
    assert.ok(s.conversations.length && s.quotes.length && s.tasks.length && s.products.length && s.services.length);
    assert.ok(s.quotes.some(q => q.origin?.type === 'note'));
    assert.ok(lowStock(s).some(p => p.id === 'ex-mask'));
    assert.equal(stockOf(s, 'ex-leavein').unitCost, null);
    assert.ok(stockOf(s, 'ex-color').quantity > 0);
});

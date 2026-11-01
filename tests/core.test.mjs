/** Utilitários de data e CSV. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, dayOffset, localDate } from '../public/core.js';

test('dayOffset atravessa meses', () => { assert.equal(dayOffset(1, '2026-01-31'), '2026-02-01'); assert.equal(dayOffset(-1, '2026-03-01'), '2026-02-28'); });
test('localDate usa formato AAAA-MM-DD', () => assert.match(localDate(), /^\d{4}-\d{2}-\d{2}$/));
test('csvCell neutraliza fórmulas e escapa aspas', () => { assert.equal(csvCell('=SOMA(1)'), `"'=SOMA(1)"`); assert.equal(csvCell('a"b'), '"a""b"'); });

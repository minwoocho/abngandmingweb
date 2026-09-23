import test from 'node:test';
import assert from 'node:assert/strict';
import { outcomes, pickOutcome, resolveSpin } from '../src/game.mjs';

test('probability and wheel sectors share all 100 outcomes', () => {
  const counts = Object.fromEntries(outcomes.map(o => [o.id, 0]));
  for (let i = 0; i < 100; i++) counts[pickOutcome((i + .5) / 100).id]++;
  for (const o of outcomes) assert.equal(counts[o.id], o.weight);
  assert.equal(outcomes.reduce((n, o) => n + o.weight, 0), 100);
});
test('blank returns the whole stake to the bettor', () => {
  assert.deepEqual(resolveSpin(4, 0, 4, 'blank'), { tickets: 4, carry: 0 });
  assert.deepEqual(resolveSpin(10, 0, 4, 'blank'), { tickets: 10, carry: 0 });
  assert.deepEqual(resolveSpin(10, 3, 4, 'blank'), { tickets: 13, carry: 0 });
});
test('carry can be replayed even after betting every remaining ticket', () => {
  assert.deepEqual(resolveSpin(4, 0, 4, 'carry'), { tickets: 0, carry: 4 });
  assert.deepEqual(resolveSpin(0, 4, 0, 'double'), { tickets: 8, carry: 0 });
  assert.deepEqual(resolveSpin(5, 4, 2, 'double'), { tickets: 15, carry: 0 });
});
test('plus, minus and multiplier outcomes return a result based on the whole stake', () => {
  assert.deepEqual(resolveSpin(15, 0, 2, 'plus5'), { tickets: 20, carry: 0 });
  assert.deepEqual(resolveSpin(15, 0, 2, 'plus2'), { tickets: 17, carry: 0 });
  assert.deepEqual(resolveSpin(15, 0, 2, 'triple'), { tickets: 19, carry: 0 });
  assert.deepEqual(resolveSpin(15, 0, 2, 'minus1'), { tickets: 14, carry: 0 });
  assert.deepEqual(resolveSpin(15, 0, 2, 'minus2'), { tickets: 13, carry: 0 });
  assert.deepEqual(resolveSpin(15, 0, 2, 'half'), { tickets: 14, carry: 0 });
  assert.deepEqual(resolveSpin(3, 0, 3, 'half'), { tickets: 1, carry: 0 });
  assert.deepEqual(resolveSpin(5, 4, 2, 'plus5'), { tickets: 14, carry: 0 });
  assert.deepEqual(resolveSpin(5, 4, 2, 'minus2'), { tickets: 7, carry: 0 });
  assert.deepEqual(resolveSpin(1, 0, 1, 'minus2'), { tickets: 0, carry: 0 });
});
test('invalid spin inputs are rejected', () => {
  for (const args of [[0,0,0,'blank'], [1,0,2,'blank'], [1,0,-1,'blank'], [5,0,1.5,'double'], [5,0,1,'unknown']]) assert.throws(() => resolveSpin(...args));
  assert.deepEqual(resolveSpin(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER, 'blank'), { tickets: Number.MAX_SAFE_INTEGER, carry: 0 });
  assert.throws(() => resolveSpin(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER, 'double'), /Ticket limit exceeded/);
  assert.throws(() => resolveSpin(Number.MAX_SAFE_INTEGER, 1, Number.MAX_SAFE_INTEGER, 'blank'), /Ticket limit exceeded/);
});

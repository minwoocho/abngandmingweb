import test from 'node:test';
import assert from 'node:assert/strict';
import { outcomes, pickOutcome, resolveSpin } from '../src/game.mjs';

test('probability and wheel sectors share all 100 outcomes', () => {
  const counts = Object.fromEntries(outcomes.map(o => [o.id, 0]));
  for (let i = 0; i < 100; i++) counts[pickOutcome((i + .5) / 100).id]++;
  for (const o of outcomes) assert.equal(counts[o.id], o.weight);
  assert.equal(outcomes.reduce((n, o) => n + o.weight, 0), 100);
});
test('all-in four tickets and blank safely reaches zero', () => {
  assert.deepEqual(resolveSpin(4, 0, 4, 'blank'), { tickets: 0, carry: 0 });
  assert.deepEqual(resolveSpin(1, 0, 1, 'minus2'), { tickets: 0, carry: 0 });
});
test('carry can be replayed even after betting every remaining ticket', () => {
  assert.deepEqual(resolveSpin(4, 0, 4, 'carry'), { tickets: 0, carry: 4 });
  assert.deepEqual(resolveSpin(0, 4, 0, 'double'), { tickets: 8, carry: 0 });
  assert.deepEqual(resolveSpin(5, 4, 2, 'double'), { tickets: 15, carry: 0 });
});
test('native payout rules and input validation', () => {
  assert.deepEqual(resolveSpin(15, 0, 2, 'plus5'), { tickets: 18, carry: 0 });
  assert.deepEqual(resolveSpin(15, 0, 2, 'half'), { tickets: 6, carry: 0 });
  for (const args of [[0,0,0,'blank'], [1,0,2,'blank'], [1,0,-1,'blank'], [5,0,1.5,'double'], [5,0,1,'unknown']]) assert.throws(() => resolveSpin(...args));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allocate, assertSumsTo, cents, formatMoney, parseAmount } from '../money.ts';

test('cents rejects a non-integer', () => {
  assert.throws(() => cents(10.5));
});

test('formats and parses round trip', () => {
  assert.equal(formatMoney(cents(6028)), '$60.28');
  assert.equal(formatMoney(cents(600)), '$6.00');
  assert.equal(formatMoney(cents(-1599)), '−$15.99');
  assert.equal(formatMoney(cents(3000), { sign: true }), '+$30.00');
  assert.equal(parseAmount('60.28'), 6028);
  assert.equal(parseAmount('$60.2'), 6020);
  assert.equal(parseAmount('60'), 6000);
  assert.equal(parseAmount('sixty'), null);
  assert.equal(parseAmount('60.283'), null);
});

test('an even split with no remainder', () => {
  const parts = allocate(cents(1650), [1, 1, 1]);
  assert.deepEqual(parts, [550, 550, 550]);
  assertSumsTo(parts, cents(1650), 'even');
});

test('the leftover cent is given to someone, never lost', () => {
  const parts = allocate(cents(1000), [1, 1, 1]);
  assert.deepEqual(parts, [334, 333, 333]);
  assertSumsTo(parts, cents(1000), 'thirds');
});

test('$0.01 across three people still sums', () => {
  const parts = allocate(cents(1), [1, 1, 1]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 1);
});

test('weights carry a bigger share', () => {
  // Paul had two of the three beers.
  const parts = allocate(cents(2100), [2, 1]);
  assert.deepEqual(parts, [1400, 700]);
});

test('fractional weights never introduce a float', () => {
  const parts = allocate(cents(1000), [0.5, 0.25, 0.25]);
  assert.deepEqual(parts, [500, 250, 250]);
  assert.ok(parts.every(Number.isInteger));
});

test('ties break towards the larger weight, then the earlier index', () => {
  const parts = allocate(cents(3728), [4228, 4628, 3078, 2678, 4028]);
  assert.deepEqual(parts, [846, 926, 615, 535, 806]);
  assertSumsTo(parts, cents(3728), 'tip');
});

test('the same input always produces the same output', () => {
  const a = allocate(cents(9999), [3, 7, 11, 2]);
  const b = allocate(cents(9999), [3, 7, 11, 2]);
  assert.deepEqual(a, b);
});

test('a thousand random splits all sum exactly', () => {
  for (let i = 1; i <= 1000; i++) {
    const total = cents(i * 7919 % 100000);
    const weights = [1 + (i % 5), 1 + (i % 3), 1 + (i % 7), 1 + (i % 2)];
    const parts = allocate(total, weights);
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
  }
});

test('zero weights are refused rather than silently dropping money', () => {
  assert.throws(() => allocate(cents(100), [0, 0]));
});

test('assertSumsTo reports the drift', () => {
  assert.throws(
    () => assertSumsTo([cents(1), cents(1)], cents(3), 'x'),
    /parts sum to 2, expected 3/,
  );
});

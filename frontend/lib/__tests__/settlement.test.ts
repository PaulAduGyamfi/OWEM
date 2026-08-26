import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as api from '../api.ts';
import { cents, sum } from '../money.ts';
import { computeSettlement, UnassignedItemsError, UnconfirmedInputError, checkReceipt } from '../settlement.ts';
import type { ItemAssignment, Participant, Receipt, ReceiptItem } from '../types.ts';

const receipt = (over: Partial<Receipt> = {}): Receipt => ({
  id: 'r', eventId: 'e', merchant: 'X', state: 'CONFIRMED',
  tax: cents(0), tip: cents(0), discount: cents(0), total: cents(0),
  tipPolicy: 'PROPORTIONAL', taxProvenance: 'USER_CONFIRMED', confirmedAt: null, ...over,
});
const item = (id: string, price: number, over: Partial<ReceiptItem> = {}): ReceiptItem => ({
  id, receiptId: 'r', lineNumber: 1, rawName: id, normalizedName: id, quantity: 1,
  totalPrice: cents(price), provenance: 'USER_CONFIRMED', confidence: null, ...over,
});
const person = (id: string, isPayer = false): Participant => ({
  id, eventId: 'e', displayName: id, isPayer, contactHandle: null,
});
const on = (itemId: string, ids: string[], weights?: number[]): ItemAssignment[] =>
  ids.map((participantId, i) => ({
    id: `${itemId}-${participantId}`, itemId, participantId,
    weight: weights?.[i] ?? 1, provenance: 'USER_CONFIRMED',
  }));

test('INVARIANT 1: an AI_SUGGESTED line cannot reach the engine', () => {
  assert.throws(
    () =>
      computeSettlement({
        receipt: receipt({ total: cents(1000) }),
        items: [item('a', 1000, { provenance: 'AI_SUGGESTED', confidence: 0.99 })],
        assignments: on('a', ['p1']),
        participants: [person('p1')],
      }),
    UnconfirmedInputError,
  );
});

test('INVARIANT 1 covers the tax as well as the lines', () => {
  assert.throws(
    () =>
      computeSettlement({
        receipt: receipt({ total: cents(1100), tax: cents(100), taxProvenance: 'AI_SUGGESTED' }),
        items: [item('a', 1000)],
        assignments: on('a', ['p1']),
        participants: [person('p1')],
      }),
    UnconfirmedInputError,
  );
});

test('an item with nobody on it stops the maths', () => {
  assert.throws(
    () =>
      computeSettlement({
        receipt: receipt({ total: cents(1000) }),
        items: [item('a', 600), item('b', 400)],
        assignments: on('a', ['p1']),
        participants: [person('p1')],
      }),
    UnassignedItemsError,
  );
});

test('tax and tip follow what each person ordered', () => {
  const lines = computeSettlement({
    receipt: receipt({ tax: cents(100), tip: cents(200), total: cents(1300) }),
    items: [item('a', 750), item('b', 250)],
    assignments: [...on('a', ['p1']), ...on('b', ['p2'])],
    participants: [person('p1', true), person('p2')],
  });
  assert.equal(lines[0].taxShare, 75);
  assert.equal(lines[1].taxShare, 25);
  assert.equal(lines[0].tipShare, 150);
  assert.equal(lines[1].tipShare, 50);
  assert.equal(sum(lines.map((l) => l.amountOwed)), 1300);
});

test('an equal split ignores what each person ordered', () => {
  const lines = computeSettlement({
    receipt: receipt({ tax: cents(0), tip: cents(300), total: cents(1300), tipPolicy: 'EQUAL' }),
    items: [item('a', 900), item('b', 100)],
    assignments: [...on('a', ['p1']), ...on('b', ['p2'])],
    participants: [person('p1'), person('p2')],
  });
  assert.equal(lines[0].tipShare, 150);
  assert.equal(lines[1].tipShare, 150);
});

test('an odd tip on three people still sums to the total', () => {
  const lines = computeSettlement({
    receipt: receipt({ tip: cents(1000), total: cents(4000) }),
    items: [item('a', 3000)],
    assignments: on('a', ['p1', 'p2', 'p3']),
    participants: [person('p1'), person('p2'), person('p3')],
  });
  assert.equal(sum(lines.map((l) => l.amountOwed)), 4000);
});

test('weights split one line unevenly', () => {
  const lines = computeSettlement({
    receipt: receipt({ total: cents(2100) }),
    items: [item('beers', 2100)],
    assignments: on('beers', ['p1', 'p2'], [2, 1]),
    participants: [person('p1'), person('p2')],
  });
  assert.equal(lines[0].itemsSubtotal, 1400);
  assert.equal(lines[1].itemsSubtotal, 700);
});

test('a discount comes off in proportion too', () => {
  const lines = computeSettlement({
    receipt: receipt({ discount: cents(200), total: cents(800) }),
    items: [item('a', 500), item('b', 500)],
    assignments: [...on('a', ['p1']), ...on('b', ['p2'])],
    participants: [person('p1'), person('p2')],
  });
  assert.equal(lines[0].amountOwed, 400);
  assert.equal(sum(lines.map((l) => l.amountOwed)), 800);
});

test('the seeded dinner produces exactly the amounts on the mockups', () => {
  const s = api.initialState();
  const st = api.latestSettlement(s, 'ev1');
  assert.ok(st);
  if (!st) return;
  const named = (name: string) => {
    const p = api.participantsOf(s, 'ev1').find((x) => x.displayName === name)!;
    return api.lineFor(st, p.id)!;
  };
  assert.equal(named('Paul').amountOwed, 5507);
  assert.equal(named('Albert').amountOwed, 6028);
  assert.equal(named('Manny').amountOwed, 4009);
  assert.equal(named('Nia').amountOwed, 3488);
  assert.equal(named('Devon').amountOwed, 5247);
  assert.equal(st.totalAmount, 24279);
  assert.equal(named('Albert').itemsSubtotal, 4628);
  assert.equal(named('Albert').taxShare, 474);
  assert.equal(named('Albert').tipShare, 926);
});

test('the seeded receipt is internally consistent', () => {
  const s = api.initialState();
  const r = api.receiptOf(s, 'ev1')!;
  const check = checkReceipt(api.itemsOf(s, r.id), r);
  assert.equal(check.itemsTotal, 18640);
  assert.equal(check.balances, true);
  assert.equal(check.drift, 0);
});

test('what is still owed on the dinner matches what has been paid', () => {
  const s = api.initialState();
  const sum1 = api.summarise(s, 'ev1');
  assert.equal(sum1.owedToPayer, 18772);
  assert.equal(sum1.collected, 6009);
  assert.equal(sum1.outstanding, 12763);
});

test('the home total is the sum of every open event', () => {
  const s = api.initialState();
  assert.equal(api.totalOutstanding(s), 17383);
});

test('INVARIANT 3: a correction writes a new version and leaves the old one alone', () => {
  let s = api.initialState();
  const v1 = api.latestSettlement(s, 'ev1')!;
  const items = api.itemsOf(s, api.receiptOf(s, 'ev1')!.id);
  const wings = items.find((i) => i.normalizedName === 'Chicken Wings')!;
  const people = api.participantsOf(s, 'ev1');
  const keep = api.assignmentsOf(s, wings.id)
    .filter((a) => a.participantId !== people.find((p) => p.displayName === 'Devon')!.id)
    .map((a) => ({ participantId: a.participantId, weight: a.weight }));

  s = api.putAssignments(s, wings.id, keep);
  s = api.createSettlement(s, 'ev1', 'Devon came off the wings');

  const v2 = api.latestSettlement(s, 'ev1')!;
  assert.equal(v2.version, 2);
  assert.equal(v1.version, 1);
  // The old version is untouched, byte for byte.
  assert.deepEqual(api.settlementHistory(s, 'ev1').find((x) => x.version === 1), v1);
  // The total never moved; the changes cancel out.
  assert.equal(v2.totalAmount, v1.totalAmount);
  const delta = v2.lines.reduce((acc, l) => {
    const before = api.lineFor(v1, l.participantId)!;
    return acc + (l.amountOwed - before.amountOwed);
  }, 0);
  assert.equal(delta, 0);
});

test('recording the last payment settles the event', () => {
  let s = api.initialState();
  const st = api.latestSettlement(s, 'ev2')!;
  for (const l of st.lines) {
    if (api.isPayer(s, l.participantId)) continue;
    s = api.createPayment(s, 'ev2', l.participantId, l.amountOwed, 'venmo');
  }
  assert.equal(api.summarise(s, 'ev2').outstanding, 0);
  assert.equal(s.events.find((e) => e.id === 'ev2')!.status, 'SETTLED');
});

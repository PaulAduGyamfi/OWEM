/**
 * The settlement engine — prototype mirror of the C# domain engine.
 *
 * PROTOTYPE ONLY. Phase 2 deletes this file: the real engine lives in
 * Owem.Domain and this app calls POST /events/{id}/settlement instead.
 * It exists so the clickable prototype shows real, consistent numbers that
 * respond to what a tester actually taps, rather than hardcoded amounts.
 *
 * It keeps the two properties the real engine must have:
 *   INVARIANT 1 — it reads only USER_CONFIRMED and SYSTEM_COMPUTED values.
 *                 Given anything AI_SUGGESTED it throws.
 *   The parts sum exactly to the total, asserted before it returns.
 */
import { allocate, assertSumsTo, cents, sum, ZERO } from './money.ts';
import type {
  Cents,
  ItemAssignment,
  Participant,
  Receipt,
  ReceiptItem,
  SettlementLine,
} from './types.ts';

export const ENGINE_VERSION = 'settlement-prototype-1.0.0';

export class UnconfirmedInputError extends Error {
  readonly itemIds: string[];
  constructor(itemIds: string[]) {
    super(`${itemIds.length} value(s) are still AI_SUGGESTED. Confirm them first.`);
    this.name = 'UnconfirmedInputError';
    this.itemIds = itemIds;
  }
}

export class UnassignedItemsError extends Error {
  readonly itemIds: string[];
  constructor(itemIds: string[]) {
    super(`${itemIds.length} item(s) are not assigned to anyone.`);
    this.name = 'UnassignedItemsError';
    this.itemIds = itemIds;
  }
}

export type SettlementInput = {
  receipt: Receipt;
  items: ReceiptItem[];
  assignments: ItemAssignment[];
  participants: Participant[];
};

export function computeSettlement(input: SettlementInput): SettlementLine[] {
  const { receipt, items, assignments, participants } = input;

  // INVARIANT 1: the guard clause at the engine boundary.
  const unconfirmed = items.filter((i) => i.provenance === 'AI_SUGGESTED').map((i) => i.id);
  if (unconfirmed.length > 0) throw new UnconfirmedInputError(unconfirmed);
  if (receipt.taxProvenance === 'AI_SUGGESTED') throw new UnconfirmedInputError(['tax']);

  const unassigned = items.filter((i) => !assignments.some((a) => a.itemId === i.id));
  if (unassigned.length > 0) throw new UnassignedItemsError(unassigned.map((i) => i.id));

  const ids = participants.map((p) => p.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const itemsSubtotal = ids.map(() => 0);

  // 1. Every item's price is split across the people on it, by weight.
  for (const item of items) {
    const on = assignments.filter((a) => a.itemId === item.id);
    const shares = allocate(item.totalPrice, on.map((a) => a.weight));
    assertSumsTo(shares, item.totalPrice, `item ${item.normalizedName}`);
    on.forEach((a, i) => {
      const at = index.get(a.participantId);
      if (at === undefined) throw new Error(`assignment references unknown participant`);
      itemsSubtotal[at] += shares[i];
    });
  }

  const subtotal = cents(itemsSubtotal.reduce((a, b) => a + b, 0));

  // 2. Tax, tip and discount follow the policy.
  //    PROPORTIONAL weights by what each person ordered; EQUAL splits per head.
  const weights =
    receipt.tipPolicy === 'EQUAL' ? ids.map(() => 1) : itemsSubtotal.map((v) => v);
  const safeWeights = weights.every((w) => w === 0) ? ids.map(() => 1) : weights;

  const taxShares = allocate(receipt.tax, safeWeights);
  const tipShares = allocate(receipt.tip, safeWeights);
  const discountShares = allocate(receipt.discount, safeWeights);

  assertSumsTo(taxShares, receipt.tax, 'tax');
  assertSumsTo(tipShares, receipt.tip, 'tip');
  assertSumsTo(discountShares, receipt.discount, 'discount');

  const lines: SettlementLine[] = ids.map((participantId, i) => ({
    participantId,
    itemsSubtotal: cents(itemsSubtotal[i]),
    taxShare: taxShares[i],
    tipShare: tipShares[i],
    discountShare: discountShares[i],
    amountOwed: cents(itemsSubtotal[i] + taxShares[i] + tipShares[i] - discountShares[i]),
  }));

  // 3. The whole point: the parts sum to the whole, exactly.
  const expected = cents(subtotal + receipt.tax + receipt.tip - receipt.discount);
  assertSumsTo(lines.map((l) => l.amountOwed), expected, 'settlement');

  return lines;
}

/** What the receipt says the bill came to, from its own parts. */
export function receiptTotalFromParts(items: ReceiptItem[], receipt: Receipt): Cents {
  return cents(sum(items.map((i) => i.totalPrice)) + receipt.tax + receipt.tip - receipt.discount);
}

/** The redundancy a receipt gives you for free — use it as a checksum. */
export function checkReceipt(items: ReceiptItem[], receipt: Receipt) {
  const itemsTotal = sum(items.map((i) => i.totalPrice));
  const computed = receiptTotalFromParts(items, receipt);
  return {
    itemsTotal,
    computed,
    printed: receipt.total,
    balances: computed === receipt.total,
    drift: cents(computed - receipt.total),
  };
}

/** Money still out, per participant, after payments. Never below zero. */
export function outstandingFor(
  line: SettlementLine | undefined,
  paid: Cents,
): Cents {
  if (!line) return ZERO;
  return cents(Math.max(0, line.amountOwed - paid));
}

/**
 * The mock backend.
 *
 * Every function here is named after the endpoint it stands in for, listed in
 * docs/architecture/api-design.md. Phase 2 replaces the body of each one with a
 * fetch to that endpoint — no screen and no component changes shape.
 *
 * Pure: each takes state and returns new state. No dates, ids or money are
 * invented anywhere else in the app.
 */
import { cents, sum, ZERO } from './money.ts';
import { nextId, seed, EXTRACTED_LINES, EXTRACTED_TAX, EXTRACTED_MERCHANT, type Db } from './mock.ts';
import { computeSettlement, ENGINE_VERSION, UnassignedItemsError, UnconfirmedInputError } from './settlement.ts';
import type {
  Cents, GroupEvent, ItemAssignment, Participant, Payment, PaymentMethod, Receipt,
  ReceiptItem, Settlement, SettlementLine, TipPolicy,
} from './types.ts';

export type State = Db & { settlements: Settlement[] };

const now = () => new Date().toISOString();

/** GET /events — plus the derived numbers every list row needs. */
export type EventSummary = {
  event: GroupEvent;
  participants: Participant[];
  headcount: number;
  total: Cents;
  owedToPayer: Cents;
  outstanding: Cents;
  collected: Cents;
  settlement: Settlement | null;
};

export function initialState(): State {
  const db = seed();
  let s: State = { ...db, settlements: [] };

  for (const event of db.events) {
    s = createSettlement(s, event.id, null);
  }

  // Kai's birthday is done: everyone but the payer paid in full.
  const kai = latestSettlement(s, 'ev3');
  if (kai) {
    const payments: Payment[] = kai.lines
      .filter((l) => !isPayer(s, l.participantId))
      .map((l, i) => ({
        id: `pay_seed3_${i}`, eventId: 'ev3', participantId: l.participantId,
        amount: l.amountOwed, method: (['venmo', 'cashapp', 'cash', 'zelle', 'applecash'] as PaymentMethod[])[i % 5],
        externalRef: null, recordedAt: '2026-08-04T12:00:00.000Z',
      }));
    s = { ...s, payments: [...s.payments, ...payments] };
  }
  return s;
}

// ── reads ───────────────────────────────────────────────────────────────────

export const participantsOf = (s: State, eventId: string): Participant[] =>
  s.participants.filter((p) => p.eventId === eventId);

export const payerOf = (s: State, eventId: string): Participant | undefined =>
  participantsOf(s, eventId).find((p) => p.isPayer);

export const isPayer = (s: State, participantId: string): boolean =>
  s.participants.find((p) => p.id === participantId)?.isPayer ?? false;

export const receiptOf = (s: State, eventId: string): Receipt | undefined =>
  s.receipts.find((r) => r.eventId === eventId);

export const itemsOf = (s: State, receiptId: string | undefined): ReceiptItem[] =>
  receiptId ? s.items.filter((i) => i.receiptId === receiptId).sort((a, b) => a.lineNumber - b.lineNumber) : [];

export const assignmentsOf = (s: State, itemId: string): ItemAssignment[] =>
  s.assignments.filter((a) => a.itemId === itemId);

export const paymentsOf = (s: State, eventId: string): Payment[] =>
  s.payments.filter((p) => p.eventId === eventId);

export const paidBy = (s: State, eventId: string, participantId: string): Cents =>
  sum(paymentsOf(s, eventId).filter((p) => p.participantId === participantId).map((p) => p.amount));

/** GET /events/{id}/settlement — the latest version. */
export function latestSettlement(s: State, eventId: string): Settlement | null {
  const all = s.settlements.filter((x) => x.eventId === eventId);
  return all.length ? all.reduce((a, b) => (b.version > a.version ? b : a)) : null;
}

export const settlementHistory = (s: State, eventId: string): Settlement[] =>
  s.settlements.filter((x) => x.eventId === eventId).sort((a, b) => b.version - a.version);

export const lineFor = (st: Settlement | null, participantId: string): SettlementLine | undefined =>
  st?.lines.find((l) => l.participantId === participantId);

/** GET /events/{id}/balances */
export function summarise(s: State, eventId: string): EventSummary {
  const event = s.events.find((e) => e.id === eventId)!;
  const participants = participantsOf(s, eventId);
  const settlement = latestSettlement(s, eventId);
  const payer = payerOf(s, eventId);

  const owedToPayer = settlement
    ? sum(settlement.lines.filter((l) => l.participantId !== payer?.id).map((l) => l.amountOwed))
    : ZERO;
  const collected = sum(paymentsOf(s, eventId).map((p) => p.amount));

  return {
    event,
    participants,
    headcount: participants.length,
    total: settlement?.totalAmount ?? receiptOf(s, eventId)?.total ?? ZERO,
    owedToPayer,
    collected,
    outstanding: cents(Math.max(0, owedToPayer - collected)),
    settlement,
  };
}

export const openEvents = (s: State): GroupEvent[] =>
  s.events.filter((e) => e.status !== 'CLOSED');

/** What the home screen's hero number is: everything still out, everywhere. */
export const totalOutstanding = (s: State): Cents =>
  sum(s.events.map((e) => summarise(s, e.id).outstanding));

// ── writes ──────────────────────────────────────────────────────────────────

/** POST /events */
export function createEvent(s: State, input: { title: string; place: string | null }): [State, string] {
  const id = nextId('ev');
  const event: GroupEvent = {
    id, title: input.title.trim() || 'Untitled event', place: input.place,
    currency: 'USD', status: 'DRAFT', occurredAt: now(), updatedAt: now(),
  };
  const payer: Participant = {
    id: nextId('pt'), eventId: id, displayName: 'Paul', isPayer: true, contactHandle: null,
  };
  return [{ ...s, events: [event, ...s.events], participants: [...s.participants, payer] }, id];
}

/** POST /events/{id}/participants */
export function addParticipant(s: State, eventId: string, displayName: string): State {
  const name = displayName.trim();
  if (!name) return s;
  const exists = participantsOf(s, eventId).some(
    (p) => p.displayName.toLowerCase() === name.toLowerCase(),
  );
  if (exists) return s;
  const p: Participant = {
    id: nextId('pt'), eventId, displayName: name, isPayer: false, contactHandle: null,
  };
  return { ...s, participants: [...s.participants, p] };
}

/** DELETE /events/{id}/participants/{pid} — only if they are on nothing. */
export function removeParticipant(s: State, participantId: string): State {
  if (s.assignments.some((a) => a.participantId === participantId)) return s;
  return {
    ...s,
    participants: s.participants.filter((p) => p.id !== participantId),
  };
}

/** POST /events/{id}/receipts */
export function createReceipt(s: State, eventId: string): [State, string] {
  const existing = receiptOf(s, eventId);
  if (existing) {
    return [
      {
        ...s,
        receipts: s.receipts.map((r) => (r.id === existing.id ? { ...r, state: 'EXTRACTING' } : r)),
        items: s.items.filter((i) => i.receiptId !== existing.id),
        assignments: s.assignments.filter(
          (a) => !s.items.some((i) => i.receiptId === existing.id && i.id === a.itemId),
        ),
      },
      existing.id,
    ];
  }
  const id = nextId('rc');
  const receipt: Receipt = {
    id, eventId, merchant: null, state: 'EXTRACTING',
    tax: ZERO, tip: ZERO, discount: ZERO, total: ZERO,
    tipPolicy: 'PROPORTIONAL', taxProvenance: 'SYSTEM_COMPUTED', confirmedAt: null,
  };
  return [{ ...s, receipts: [...s.receipts, receipt] }, id];
}

/**
 * What the extraction call comes back with. Everything a model produced lands
 * as AI_SUGGESTED — including the tax — and cannot reach the engine until a
 * person confirms it.
 */
export function applyExtraction(s: State, receiptId: string): State {
  const items: ReceiptItem[] = EXTRACTED_LINES.map((l, n) => ({
    id: nextId('it'), receiptId, lineNumber: n + 1,
    rawName: l.raw, normalizedName: l.name, quantity: l.qty,
    totalPrice: cents(l.price), provenance: 'AI_SUGGESTED', confidence: l.confidence,
  }));
  return {
    ...s,
    items: [...s.items, ...items],
    receipts: s.receipts.map((r) =>
      r.id === receiptId
        ? { ...r, state: 'NEEDS_REVIEW', merchant: EXTRACTED_MERCHANT, tax: EXTRACTED_TAX, taxProvenance: 'AI_SUGGESTED' }
        : r,
    ),
  };
}

/** PATCH /receipts/{id}/items/{iid} — any edit is a human accepting the line. */
export function patchItem(
  s: State, itemId: string, patch: Partial<Pick<ReceiptItem, 'normalizedName' | 'quantity' | 'totalPrice'>>,
): State {
  return {
    ...s,
    items: s.items.map((i) =>
      i.id === itemId ? { ...i, ...patch, provenance: 'USER_CONFIRMED' } : i,
    ),
  };
}

export const confirmItem = (s: State, itemId: string): State => patchItem(s, itemId, {});

/** DELETE /receipts/{id}/items/{iid} */
export function deleteItem(s: State, itemId: string): State {
  return {
    ...s,
    items: s.items.filter((i) => i.id !== itemId),
    assignments: s.assignments.filter((a) => a.itemId !== itemId),
  };
}

/** POST /receipts/{id}/items — typed in by hand, so confirmed on arrival. */
export function addItem(s: State, receiptId: string, input: { name: string; price: Cents }): State {
  const n = itemsOf(s, receiptId).length + 1;
  const item: ReceiptItem = {
    id: nextId('it'), receiptId, lineNumber: n,
    rawName: input.name.toUpperCase(), normalizedName: input.name,
    quantity: 1, totalPrice: input.price, provenance: 'USER_CONFIRMED', confidence: null,
  };
  return { ...s, items: [...s.items, item] };
}

export function confirmAllItems(s: State, receiptId: string): State {
  return {
    ...s,
    items: s.items.map((i) => (i.receiptId === receiptId ? { ...i, provenance: 'USER_CONFIRMED' } : i)),
    receipts: s.receipts.map((r) => (r.id === receiptId ? { ...r, taxProvenance: 'USER_CONFIRMED' } : r)),
  };
}

export function setCharges(
  s: State, receiptId: string,
  input: { tax?: Cents; tip?: Cents; discount?: Cents; tipPolicy?: TipPolicy },
): State {
  return {
    ...s,
    receipts: s.receipts.map((r) => {
      if (r.id !== receiptId) return r;
      const next = { ...r, ...input, taxProvenance: 'USER_CONFIRMED' as const };
      const items = itemsOf(s, receiptId);
      const subtotal = sum(items.map((i) => i.totalPrice));
      return { ...next, total: cents(subtotal + next.tax + next.tip - next.discount) };
    }),
  };
}

/** POST /receipts/{id}/confirm */
export function confirmReceipt(s: State, receiptId: string): State {
  return {
    ...s,
    receipts: s.receipts.map((r) =>
      r.id === receiptId ? { ...r, state: 'CONFIRMED', confirmedAt: now() } : r,
    ),
  };
}

/**
 * PUT /items/{id}/assignments — the COMPLETE set, replaced atomically.
 * "Who is on this item" is one logical fact; there is no half-applied state.
 */
export function putAssignments(
  s: State, itemId: string, on: { participantId: string; weight: number }[],
): State {
  const fresh: ItemAssignment[] = on.map((x) => ({
    id: nextId('as'), itemId, participantId: x.participantId,
    weight: x.weight, provenance: 'USER_CONFIRMED',
  }));
  return { ...s, assignments: [...s.assignments.filter((a) => a.itemId !== itemId), ...fresh] };
}

/**
 * POST /events/{id}/settlement — creates a NEW version. INVARIANT 3: an
 * existing settlement row is never updated.
 */
export function createSettlement(s: State, eventId: string, reason: string | null): State {
  const receipt = receiptOf(s, eventId);
  if (!receipt) return s;
  const lines = computeSettlement({
    receipt,
    items: itemsOf(s, receipt.id),
    assignments: s.assignments.filter((a) => itemsOf(s, receipt.id).some((i) => i.id === a.itemId)),
    participants: participantsOf(s, eventId),
  });
  const previous = latestSettlement(s, eventId);
  const settlement: Settlement = {
    id: nextId('st'), eventId, version: (previous?.version ?? 0) + 1,
    totalAmount: sum(lines.map((l) => l.amountOwed)),
    engineVersion: ENGINE_VERSION, createdAt: now(), reason,
    lines,
  };
  return {
    ...s,
    settlements: [...s.settlements, settlement],
    events: s.events.map((e) =>
      e.id === eventId && e.status === 'DRAFT' ? { ...e, status: 'COLLECTING', updatedAt: now() } : e,
    ),
  };
}

/** POST /events/{id}/payments */
export function createPayment(
  s: State, eventId: string, participantId: string, amount: Cents, method: PaymentMethod,
): State {
  if (amount <= 0) return s;
  const payment: Payment = {
    id: nextId('pay'), eventId, participantId, amount, method,
    externalRef: null, recordedAt: now(),
  };
  const next = { ...s, payments: [...s.payments, payment] };
  const after = summarise(next, eventId);
  return {
    ...next,
    events: next.events.map((e) =>
      e.id === eventId && after.outstanding === 0 ? { ...e, status: 'SETTLED', updatedAt: now() } : e,
    ),
  };
}

export function closeEvent(s: State, eventId: string): State {
  return {
    ...s,
    events: s.events.map((e) => (e.id === eventId ? { ...e, status: 'CLOSED', updatedAt: now() } : e)),
  };
}

export { UnassignedItemsError, UnconfirmedInputError };

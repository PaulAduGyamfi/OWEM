/**
 * Seed data for the prototype. One consistent scenario, chosen so the numbers
 * on screen are the ones the engine actually produces — nothing here is a
 * hardcoded balance.
 *
 * Phase 2 deletes this file; the same shapes come from GET /events/{id}.
 */
import { cents } from './money.ts';
import type {
  Cents, GroupEvent, ItemAssignment, Participant, Payment, Receipt, ReceiptItem,
} from './types.ts';

let seq = 0;
export const nextId = (prefix: string): string => `${prefix}_${++seq}`;

export type Db = {
  events: GroupEvent[];
  participants: Participant[];
  receipts: Receipt[];
  items: ReceiptItem[];
  assignments: ItemAssignment[];
  payments: Payment[];
};

const c = (n: number): Cents => cents(n);

/** The receipt the mock extraction returns. Rosati's, Logan Square. */
export const EXTRACTED_LINES: {
  raw: string; name: string; qty: number; price: number; confidence: number;
}[] = [
  { raw: 'MRG PZA', name: 'Margherita Pizza', qty: 1, price: 1800, confidence: 0.97 },
  { raw: 'CHK WNG', name: 'Chicken Wings', qty: 1, price: 1650, confidence: 0.71 },
  { raw: 'CSR SLD', name: 'Caesar Salad', qty: 1, price: 1200, confidence: 0.96 },
  { raw: 'RIG VDKA', name: 'Rigatoni Vodka', qty: 1, price: 2200, confidence: 0.94 },
  { raw: 'CHK PARM', name: 'Chicken Parm', qty: 1, price: 2400, confidence: 0.95 },
  { raw: 'CALAMARI', name: 'Calamari', qty: 1, price: 1500, confidence: 0.98 },
  { raw: 'GRLC KNT', name: 'Garlic Knots', qty: 1, price: 850, confidence: 0.93 },
  { raw: '2 MARG', name: 'Margarita', qty: 2, price: 2600, confidence: 0.68 },
  { raw: '3 PERONI', name: 'Peroni', qty: 3, price: 2100, confidence: 0.91 },
  { raw: 'TIRAMISU', name: 'Tiramisu', qty: 1, price: 1100, confidence: 0.97 },
  { raw: '2 ESPRSO', name: 'Espresso', qty: 2, price: 700, confidence: 0.89 },
  { raw: 'SPK WTR', name: 'Sparkling water', qty: 1, price: 540, confidence: 0.92 },
];

/** A line is sent for human review below this. See docs/architecture/ai-design.md. */
export const CONFIDENCE_FLOOR = 0.85;

export const EXTRACTED_TAX = c(1911);
export const EXTRACTED_MERCHANT = "Rosati's";
/** 20% of the $186.40 subtotal — what the app suggests, not what the receipt says. */
export const SUGGESTED_TIP = c(3728);

function ev(
  id: string, title: string, place: string, day: string,
  status: GroupEvent['status'],
): GroupEvent {
  return {
    id, title, place, currency: 'USD', status,
    occurredAt: day, updatedAt: day,
  };
}

function people(eventId: string, names: string[]): Participant[] {
  return names.map((displayName, i) => ({
    id: `${eventId}_p${i}`,
    eventId,
    displayName,
    isPayer: i === 0,
    contactHandle: null,
  }));
}

function receipt(
  eventId: string, merchant: string, tax: number, tip: number, total: number,
): Receipt {
  return {
    id: `${eventId}_r`, eventId, merchant, state: 'CONFIRMED',
    tax: c(tax), tip: c(tip), discount: c(0), total: c(total),
    tipPolicy: 'PROPORTIONAL', taxProvenance: 'USER_CONFIRMED',
    confirmedAt: `${eventId === 'ev1' ? '2026-08-22T21:41:00' : '2026-08-15T20:10:00'}.000Z`,
  };
}

function line(
  receiptId: string, n: number, raw: string, name: string, qty: number, price: number,
): ReceiptItem {
  return {
    id: `${receiptId}_i${n}`, receiptId, lineNumber: n,
    rawName: raw, normalizedName: name, quantity: qty, totalPrice: c(price),
    provenance: 'USER_CONFIRMED', confidence: null,
  };
}

function assign(itemId: string, participantIds: string[], weights?: number[]): ItemAssignment[] {
  return participantIds.map((participantId, i) => ({
    id: `${itemId}_a${i}`, itemId, participantId,
    weight: weights?.[i] ?? 1, provenance: 'USER_CONFIRMED',
  }));
}

export function seed(): Db {
  // ── Event 1 · Dinner at Rosati's · mid-collection ──────────────────────────
  const e1 = ev('ev1', "Dinner at Rosati's", "Rosati's, Logan Square", '2026-08-22T19:30:00.000Z', 'COLLECTING');
  const p1 = people('ev1', ['Paul', 'Albert', 'Manny', 'Nia', 'Devon']);
  const [paul, albert, manny, nia, devon] = p1.map((p) => p.id);
  const r1 = receipt('ev1', "Rosati's", 1911, 3728, 24279);
  const i1 = EXTRACTED_LINES.map((l, n) => line(r1.id, n + 1, l.raw, l.name, l.qty, l.price));
  const byName = (name: string) => i1.find((i) => i.normalizedName === name)!.id;
  const everyone = [paul, albert, manny, nia, devon];

  const a1: ItemAssignment[] = [
    ...assign(byName('Margherita Pizza'), [manny]),
    ...assign(byName('Chicken Wings'), [paul, albert, devon]),
    ...assign(byName('Caesar Salad'), [nia]),
    ...assign(byName('Rigatoni Vodka'), [albert]),
    ...assign(byName('Chicken Parm'), [paul]),
    ...assign(byName('Calamari'), everyone),
    ...assign(byName('Garlic Knots'), everyone),
    ...assign(byName('Margarita'), [albert, devon]),
    ...assign(byName('Peroni'), [paul, manny, devon]),
    ...assign(byName('Tiramisu'), [nia, devon]),
    ...assign(byName('Espresso'), [nia, devon]),
    ...assign(byName('Sparkling water'), everyone),
  ];

  const pay1: Payment[] = [
    {
      id: 'pay_1', eventId: 'ev1', participantId: manny, amount: c(4009),
      method: 'cashapp', externalRef: null, recordedAt: '2026-08-23T09:12:00.000Z',
    },
    {
      id: 'pay_2', eventId: 'ev1', participantId: nia, amount: c(2000),
      method: 'venmo', externalRef: null, recordedAt: '2026-08-23T18:40:00.000Z',
    },
  ];

  // ── Event 2 · Taco night · nobody has paid ────────────────────────────────
  const e2 = ev('ev2', "Taco night at Vera's", "Vera's", '2026-08-15T19:00:00.000Z', 'COLLECTING');
  const p2 = people('ev2', ['Paul', 'Jo', 'Riley', 'Sam']);
  const [paul2, jo, riley, sam] = p2.map((p) => p.id);
  const r2 = receipt('ev2', "Vera's", 340, 793, 5133);
  const i2 = [
    line(r2.id, 1, 'AL PSTR', 'Al pastor tacos', 1, 800),
    line(r2.id, 2, 'CARNITAS BRTO', 'Carnitas burrito', 1, 900),
    line(r2.id, 3, 'VEG BOWL', 'Veggie bowl', 1, 700),
    line(r2.id, 4, 'CHPS GUAC', 'Chips and guacamole', 1, 1600),
  ];
  const a2: ItemAssignment[] = [
    ...assign(i2[0].id, [jo]),
    ...assign(i2[1].id, [riley]),
    ...assign(i2[2].id, [sam]),
    ...assign(i2[3].id, [paul2, jo, riley, sam]),
  ];

  // ── Event 3 · Kai's birthday · everyone squared up ────────────────────────
  const e3 = ev('ev3', "Kai's birthday · Ombu", 'Ombu', '2026-08-02T20:00:00.000Z', 'SETTLED');
  const p3 = people('ev3', ['Paul', 'Kai', 'Rae', 'Tom', 'Lena', 'Chris']);
  const r3 = receipt('ev3', 'Ombu', 1080, 2160, 16040);
  const i3 = [
    line(r3.id, 1, 'TSTNG MENU 6', 'Tasting menu', 6, 10800),
    line(r3.id, 2, 'BTL RIOJA', 'Bottle of Rioja', 1, 2000),
  ];
  const a3: ItemAssignment[] = [
    ...assign(i3[0].id, p3.map((p) => p.id)),
    ...assign(i3[1].id, p3.map((p) => p.id)),
  ];

  return {
    events: [e1, e2, e3],
    participants: [...p1, ...p2, ...p3],
    receipts: [r1, r2, r3],
    items: [...i1, ...i2, ...i3],
    assignments: [...a1, ...a2, ...a3],
    payments: pay1,
  };
}

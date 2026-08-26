/**
 * Mirrors docs/architecture/data-model.md one-for-one.
 * Money is WHOLE CENTS everywhere in this app. Never float, never a dollar number.
 */

export type Provenance = 'AI_SUGGESTED' | 'USER_CONFIRMED' | 'SYSTEM_COMPUTED';
export type EventStatus = 'DRAFT' | 'COLLECTING' | 'SETTLED' | 'CLOSED';
export type ReceiptState = 'DRAFT' | 'EXTRACTING' | 'NEEDS_REVIEW' | 'CONFIRMED';
export type TipPolicy = 'PROPORTIONAL' | 'EQUAL';
export type PaymentMethod = 'venmo' | 'cashapp' | 'zelle' | 'applecash' | 'cash' | 'other';

/** Whole cents. Branded so a dollar number can never be passed by mistake. */
export type Cents = number & { readonly __cents: unique symbol };

export type GroupEvent = {
  id: string;
  title: string;
  place: string | null;
  currency: 'USD';
  status: EventStatus;
  occurredAt: string;
  updatedAt: string;
};

export type Participant = {
  id: string;
  eventId: string;
  displayName: string;
  isPayer: boolean;
  contactHandle: string | null;
};

export type Receipt = {
  id: string;
  eventId: string;
  merchant: string | null;
  state: ReceiptState;
  tax: Cents;
  tip: Cents;
  discount: Cents;
  total: Cents;
  tipPolicy: TipPolicy;
  taxProvenance: Provenance;
  confirmedAt: string | null;
};

export type ReceiptItem = {
  id: string;
  receiptId: string;
  lineNumber: number;
  rawName: string;
  normalizedName: string;
  quantity: number;
  totalPrice: Cents;
  provenance: Provenance;
  /** 0–1, null unless a model produced it. */
  confidence: number | null;
};

export type ItemAssignment = {
  id: string;
  itemId: string;
  participantId: string;
  /** "Paul had two of the three beers" — weights keep the maths uniform. */
  weight: number;
  provenance: Provenance;
};

export type SettlementLine = {
  participantId: string;
  itemsSubtotal: Cents;
  taxShare: Cents;
  tipShare: Cents;
  discountShare: Cents;
  amountOwed: Cents;
};

/** INVARIANT 3: never updated. A correction writes version + 1. */
export type Settlement = {
  id: string;
  eventId: string;
  version: number;
  totalAmount: Cents;
  engineVersion: string;
  createdAt: string;
  /** Why this version exists. Null on version 1. */
  reason: string | null;
  lines: SettlementLine[];
};

export type Payment = {
  id: string;
  eventId: string;
  participantId: string;
  amount: Cents;
  method: PaymentMethod;
  externalRef: string | null;
  recordedAt: string;
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  zelle: 'Zelle',
  applecash: 'Apple Cash',
  cash: 'Cash',
  other: 'Other',
};

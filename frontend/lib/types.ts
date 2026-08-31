export type Cents = number & { readonly __cents: unique symbol };

export type Provenance = 'AI_SUGGESTED' | 'USER_CONFIRMED' | 'SYSTEM_COMPUTED';
export type EventStatus = 'DRAFT' | 'COLLECTING' | 'SETTLED' | 'CLOSED';
export type ReceiptState = 'DRAFT' | 'NEEDS_REVIEW' | 'CONFIRMED';
export type TipPolicy = 'PROPORTIONAL' | 'EQUAL';
export type PaymentMethod = 'venmo' | 'cashapp' | 'zelle' | 'applecash' | 'cash' | 'other';

export type Event = {
  id: string;
  title: string;
  place: string | null;
  currency: string;
  status: EventStatus;
  occurredAt: string;
};

export type Participant = {
  id: string;
  eventId: string;
  displayName: string;
  isPayer: boolean;
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
  confidence: number | null;
};

export type Assignment = {
  id: string;
  itemId: string;
  participantId: string;
  weight: number;
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
};

export type SettlementLine = {
  participantId: string;
  itemsSubtotal: Cents;
  taxShare: Cents;
  tipShare: Cents;
  discountShare: Cents;
  amountOwed: Cents;
};

export type Settlement = {
  id: string;
  eventId: string;
  version: number;
  totalAmount: Cents;
  engineVersion: string;
  reason: string | null;
  createdAt: string;
  lines: SettlementLine[];
};

export type Payment = {
  id: string;
  eventId: string;
  participantId: string;
  amount: Cents;
  method: PaymentMethod;
  recordedAt: string;
};

export type EventDetail = Event & {
  participants: Participant[];
  receipt: Receipt | null;
  items: ReceiptItem[];
  assignments: Assignment[];
  payments: Payment[];
  settlementVersion: number | null;
};

export type Extraction = {
  receipt: Receipt;
  items: ReceiptItem[];
  needsReview: number[];
  problems: string[];
  merchant: string | null;
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  zelle: 'Zelle',
  applecash: 'Apple Cash',
  cash: 'Cash',
  other: 'Other',
};

export const CONFIDENCE_FLOOR = 0.85;

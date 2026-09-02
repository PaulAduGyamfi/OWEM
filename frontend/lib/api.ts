import { cents, parseAmount } from './money.ts';
import type {
  Assignment,
  Cents,
  Event,
  EventDetail,
  Payment,
  PaymentMethod,
  Participant,
  Receipt,
  ReceiptItem,
  Settlement,
  SettlementLine,
  Extraction,
  TipPolicy,
} from './types.ts';

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: isForm || body === undefined ? {} : { 'content-type': 'application/json' },
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'UNREACHABLE', `Could not reach ${API_BASE}.`, {});
  }

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const { error } = (parsed ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? response.statusText,
      error?.details ?? {},
    );
  }
  return parsed as T;
}

export function toCents(amount: string): Cents {
  const parsed = parseAmount(amount);
  if (parsed === null) throw new Error(`unreadable amount from the API: ${amount}`);
  return parsed;
}

export function toAmount(value: Cents): string {
  const abs = Math.abs(value);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export async function isReachable(timeoutMs = 3000): Promise<boolean> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: abort.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

type Wire<T> = { [K in keyof T]: T[K] extends Cents ? string : T[K] };

function toReceipt(wire: Wire<Receipt>): Receipt {
  return {
    ...wire,
    tax: toCents(wire.tax),
    tip: toCents(wire.tip),
    discount: toCents(wire.discount),
    total: toCents(wire.total),
  };
}

function toItem(wire: Wire<ReceiptItem>): ReceiptItem {
  return { ...wire, totalPrice: toCents(wire.totalPrice) };
}

function toSettlement(wire: Omit<Settlement, 'totalAmount' | 'lines'> & {
  totalAmount: string;
  lines: Wire<SettlementLine>[];
}): Settlement {
  return {
    ...wire,
    totalAmount: toCents(wire.totalAmount),
    lines: wire.lines.map((line) => ({
      participantId: line.participantId,
      itemsSubtotal: toCents(line.itemsSubtotal),
      taxShare: toCents(line.taxShare),
      tipShare: toCents(line.tipShare),
      discountShare: toCents(line.discountShare),
      amountOwed: toCents(line.amountOwed),
    })),
  };
}

function toPayment(wire: Wire<Payment>): Payment {
  return { ...wire, amount: toCents(wire.amount) };
}

export const api = {
  listEvents: () => request<Event[]>('GET', '/events'),

  getEvent: async (id: string): Promise<EventDetail> => {
    const wire = await request<
      Event & {
        participants: Participant[];
        receipt: Wire<Receipt> | null;
        items: Wire<ReceiptItem>[];
        assignments: { id: string; itemId: string; participantId: string; weight: string }[];
        payments: Wire<Payment>[];
        settlementVersion: number | null;
      }
    >('GET', `/events/${id}`);
    return {
      ...wire,
      receipt: wire.receipt ? toReceipt(wire.receipt) : null,
      items: wire.items.map(toItem),
      assignments: wire.assignments.map((a) => ({ ...a, weight: Number(a.weight) })),
      payments: wire.payments.map(toPayment),
    };
  },

  listSettlements: async (eventId: string): Promise<Settlement[]> => {
    const wire = await request<Parameters<typeof toSettlement>[0][]>(
      'GET', `/events/${eventId}/settlements`);
    return wire.map(toSettlement);
  },

  getSettlement: async (eventId: string) =>
    toSettlement(await request('GET', `/events/${eventId}/settlement`)),

  createEvent: (title: string, place: string | null, occurredAt: string | null) =>
    request<Event>('POST', '/events', { title, place, occurredAt }),

  deleteEvent: (eventId: string) => request<void>('DELETE', `/events/${eventId}`),

  addParticipant: (eventId: string, displayName: string) =>
    request('POST', `/events/${eventId}/participants`, { displayName }),

  removeParticipant: (eventId: string, participantId: string) =>
    request('DELETE', `/events/${eventId}/participants/${participantId}`),

  createReceipt: async (eventId: string) =>
    toReceipt(await request('POST', `/events/${eventId}/receipts`)),

  extract: async (eventId: string, photo: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('photo', photo as unknown as Blob);
    const wire = await request<{
      receipt: Wire<Receipt>;
      items: Wire<ReceiptItem>[];
      needsReview: number[];
      problems: string[];
      merchant: string | null;
    }>('POST', `/events/${eventId}/receipts/extract`, form);
    return {
      ...wire,
      receipt: toReceipt(wire.receipt),
      items: wire.items.map(toItem),
    } satisfies Extraction;
  },

  addItem: async (receiptId: string, name: string, price: Cents) =>
    toItem(await request('POST', `/receipts/${receiptId}/items`, {
      name,
      totalPrice: toAmount(price),
    })),

  updateItem: async (receiptId: string, itemId: string, name?: string, price?: Cents) =>
    toItem(await request('PATCH', `/receipts/${receiptId}/items/${itemId}`, {
      name,
      totalPrice: price === undefined ? undefined : toAmount(price),
    })),

  deleteItem: (receiptId: string, itemId: string) =>
    request('DELETE', `/receipts/${receiptId}/items/${itemId}`),

  setCharges: (
    receiptId: string,
    charges: { tax?: Cents; tip?: Cents; discount?: Cents; tipPolicy?: TipPolicy },
  ) =>
    request<Wire<Receipt>>('PATCH', `/receipts/${receiptId}`, {
      tax: charges.tax === undefined ? undefined : toAmount(charges.tax),
      tip: charges.tip === undefined ? undefined : toAmount(charges.tip),
      discount: charges.discount === undefined ? undefined : toAmount(charges.discount),
      tipPolicy: charges.tipPolicy,
    }).then(toReceipt),

  confirmReceipt: async (receiptId: string) =>
    toReceipt(await request('POST', `/receipts/${receiptId}/confirm`)),

  putAssignments: (itemId: string, on: { participantId: string; weight: number }[]) =>
    request<Assignment[]>('PUT', `/items/${itemId}/assignments`, {
      assignments: on.map((a) => ({ participantId: a.participantId, weight: a.weight.toFixed(3) })),
    }),

  createSettlement: async (eventId: string, reason: string | null) =>
    toSettlement(await request('POST', `/events/${eventId}/settlement`, { reason })),

  createPayment: (
    eventId: string,
    participantId: string,
    amount: Cents,
    method: PaymentMethod,
  ) =>
    request<Wire<Payment>>('POST', `/events/${eventId}/payments`, {
      participantId,
      amount: toAmount(amount),
      method,
    }).then(toPayment),
};

export { cents };

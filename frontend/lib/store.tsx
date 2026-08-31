import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api } from './api.ts';
import { cents } from './money.ts';
import type {
  Assignment,
  Cents,
  Event,
  EventDetail,
  Extraction,
  Participant,
  PaymentMethod,
  Settlement,
  SettlementLine,
  TipPolicy,
} from './types.ts';

export type State = {
  events: Event[];
  details: Record<string, EventDetail>;
  settlements: Record<string, Settlement>;
  history: Record<string, Settlement[]>;
};

const EMPTY: State = { events: [], details: {}, settlements: {}, history: {} };

export type Summary = {
  event: Event;
  participants: Participant[];
  headcount: number;
  owedToPayer: Cents;
  collected: Cents;
  outstanding: Cents;
  settlement: Settlement | null;
};

export function detailOf(state: State, eventId: string): EventDetail | undefined {
  return state.details[eventId];
}

export function participantsOf(state: State, eventId: string): Participant[] {
  return state.details[eventId]?.participants ?? [];
}

export function itemsOf(state: State, eventId: string) {
  return state.details[eventId]?.items ?? [];
}

export function assignmentsOf(state: State, eventId: string, itemId: string): Assignment[] {
  return (state.details[eventId]?.assignments ?? []).filter((a) => a.itemId === itemId);
}

export function latestSettlement(state: State, eventId: string): Settlement | null {
  return state.settlements[eventId] ?? null;
}

export function lineFor(
  settlement: Settlement | null,
  participantId: string,
): SettlementLine | undefined {
  return settlement?.lines.find((line) => line.participantId === participantId);
}

export function isPayer(state: State, eventId: string, participantId: string): boolean {
  return participantsOf(state, eventId).some((p) => p.id === participantId && p.isPayer);
}

export function paidBy(state: State, eventId: string, participantId: string): Cents {
  const payments = state.details[eventId]?.payments ?? [];
  return cents(
    payments
      .filter((payment) => payment.participantId === participantId)
      .reduce((total, payment) => total + payment.amount, 0),
  );
}

export function summarise(state: State, eventId: string): Summary {
  const detail = state.details[eventId];
  const event = detail ?? state.events.find((e) => e.id === eventId)!;
  const participants = detail?.participants ?? [];
  const settlement = latestSettlement(state, eventId);
  const payer = participants.find((p) => p.isPayer);

  const owing = (settlement?.lines ?? []).filter((line) => line.participantId !== payer?.id);
  const owed = owing.reduce((total, line) => total + line.amountOwed, 0);
  const paid = owing.reduce(
    (total, line) => total + paidBy(state, eventId, line.participantId),
    0,
  );
  const outstanding = owing.reduce(
    (total, line) =>
      total + Math.max(0, line.amountOwed - paidBy(state, eventId, line.participantId)),
    0,
  );

  return {
    event,
    participants,
    headcount: participants.length,
    owedToPayer: cents(owed),
    collected: cents(paid),
    outstanding: cents(outstanding),
    settlement,
  };
}

export function totalOutstanding(state: State): Cents {
  return cents(
    state.events.reduce((total, event) => total + summarise(state, event.id).outstanding, 0),
  );
}

type Store = {
  s: State;
  loading: boolean;
  busy: boolean;
  lastError: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  createEvent: (title: string, place: string | null) => Promise<string>;
  addParticipant: (eventId: string, name: string) => Promise<void>;
  removeParticipant: (eventId: string, participantId: string) => Promise<void>;
  createReceipt: (eventId: string) => Promise<string>;
  extractReceipt: (
    eventId: string,
    photo: { uri: string; name: string; type: string },
  ) => Promise<Extraction | null>;
  addItem: (eventId: string, receiptId: string, name: string, price: Cents) => Promise<void>;
  updateItem: (
    eventId: string,
    receiptId: string,
    itemId: string,
    name?: string,
    price?: Cents,
  ) => Promise<void>;
  deleteItem: (eventId: string, receiptId: string, itemId: string) => Promise<void>;
  setCharges: (
    eventId: string,
    receiptId: string,
    charges: { tax?: Cents; tip?: Cents; discount?: Cents; tipPolicy?: TipPolicy },
  ) => Promise<void>;
  confirmReceipt: (eventId: string, receiptId: string) => Promise<void>;
  putAssignments: (
    eventId: string,
    itemId: string,
    on: { participantId: string; weight: number }[],
  ) => Promise<void>;
  createSettlement: (eventId: string, reason?: string | null) => Promise<void>;
  createPayment: (
    eventId: string,
    participantId: string,
    amount: Cents,
    method: PaymentMethod,
  ) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadEvent = useCallback(async (eventId: string) => {
    const detail = await api.getEvent(eventId);
    const versions =
      detail.settlementVersion === null ? [] : await api.listSettlements(eventId);
    setS((prev) => ({
      events: prev.events.some((e) => e.id === eventId)
        ? prev.events.map((e) => (e.id === eventId ? detail : e))
        : [detail, ...prev.events],
      details: { ...prev.details, [eventId]: detail },
      settlements: versions[0]
        ? { ...prev.settlements, [eventId]: versions[0] }
        : prev.settlements,
      history: { ...prev.history, [eventId]: versions },
    }));
  }, []);

  const refresh = useCallback(async () => {
    const events = await api.listEvents();
    const details: Record<string, EventDetail> = {};
    const settlements: Record<string, Settlement> = {};
    const history: Record<string, Settlement[]> = {};
    for (const event of events) {
      const detail = await api.getEvent(event.id);
      details[event.id] = detail;
      if (detail.settlementVersion !== null) {
        const versions = await api.listSettlements(event.id);
        history[event.id] = versions;
        if (versions[0]) settlements[event.id] = versions[0];
      }
    }
    setS({ events, details, settlements, history });
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (error) {
        setLastError(error instanceof ApiError ? error.message : 'Could not load your events.');
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const run = useCallback(
    async <T,>(call: () => Promise<T>, after?: () => Promise<void>): Promise<T | null> => {
      setBusy(true);
      setLastError(null);
      try {
        const result = await call();
        if (after) await after();
        return result;
      } catch (error) {
        setLastError(
          error instanceof ApiError ? error.message : 'Something went wrong. Try again.',
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const value = useMemo<Store>(
    () => ({
      s,
      loading,
      busy,
      lastError,
      clearError: () => setLastError(null),
      refresh,

      createEvent: async (title, place) => {
        const event = await run(() => api.createEvent(title, place));
        if (event) await loadEvent(event.id);
        return event?.id ?? '';
      },

      createReceipt: async (eventId) => {
        const receipt = await run(() => api.createReceipt(eventId), () => loadEvent(eventId));
        return receipt?.id ?? '';
      },

      extractReceipt: (eventId, photo) =>
        run(() => api.extract(eventId, photo), () => loadEvent(eventId)),

      addParticipant: async (eventId, name) => {
        await run(() => api.addParticipant(eventId, name), () => loadEvent(eventId));
      },
      removeParticipant: async (eventId, participantId) => {
        await run(
          () => api.removeParticipant(eventId, participantId),
          () => loadEvent(eventId),
        );
      },
      addItem: async (eventId, receiptId, name, price) => {
        await run(() => api.addItem(receiptId, name, price), () => loadEvent(eventId));
      },
      updateItem: async (eventId, receiptId, itemId, name, price) => {
        await run(
          () => api.updateItem(receiptId, itemId, name, price),
          () => loadEvent(eventId),
        );
      },
      deleteItem: async (eventId, receiptId, itemId) => {
        await run(() => api.deleteItem(receiptId, itemId), () => loadEvent(eventId));
      },
      setCharges: async (eventId, receiptId, charges) => {
        await run(() => api.setCharges(receiptId, charges), () => loadEvent(eventId));
      },
      confirmReceipt: async (eventId, receiptId) => {
        await run(() => api.confirmReceipt(receiptId), () => loadEvent(eventId));
      },
      putAssignments: async (eventId, itemId, on) => {
        await run(() => api.putAssignments(itemId, on), () => loadEvent(eventId));
      },
      createSettlement: async (eventId, reason = null) => {
        await run(() => api.createSettlement(eventId, reason), () => loadEvent(eventId));
      },
      createPayment: async (eventId, participantId, amount, method) => {
        await run(
          () => api.createPayment(eventId, participantId, amount, method),
          () => loadEvent(eventId),
        );
      },
    }),
    [s, loading, busy, lastError, run, refresh, loadEvent],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOwem(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useOwem must be used inside StoreProvider');
  return store;
}

export function useEvent(eventId: string) {
  const { s } = useOwem();
  return useMemo(() => {
    const detail = s.details[eventId];
    return {
      event: detail,
      receipt: detail?.receipt ?? null,
      participants: detail?.participants ?? [],
      payer: detail?.participants.find((p) => p.isPayer),
      items: detail?.items ?? [],
      payments: detail?.payments ?? [],
      settlement: latestSettlement(s, eventId),
      history: s.history[eventId] ?? [],
      summary: detail ? summarise(s, eventId) : null,
    };
  }, [s, eventId]);
}

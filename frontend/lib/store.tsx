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
import { EMPTY, latestSettlement, summarise, type State } from './selectors.ts';
import type { Cents, EventDetail, Extraction, PaymentMethod, Settlement, TipPolicy } from './types.ts';

export * from './selectors.ts';

type Store = {
  s: State;
  loading: boolean;
  busy: boolean;
  lastError: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  createEvent: (title: string, place: string | null, occurredAt: string | null) => Promise<string>;
  deleteEvent: (eventId: string) => Promise<void>;
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

  const forgetEvent = useCallback((eventId: string) => {
    setS((prev) => {
      const { [eventId]: _detail, ...details } = prev.details;
      const { [eventId]: _settlement, ...settlements } = prev.settlements;
      const { [eventId]: _history, ...history } = prev.history;
      return {
        events: prev.events.filter((e) => e.id !== eventId),
        details,
        settlements,
        history,
      };
    });
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

      createEvent: async (title, place, occurredAt) => {
        const event = await run(() => api.createEvent(title, place, occurredAt));
        if (event) await loadEvent(event.id);
        return event?.id ?? '';
      },

      deleteEvent: async (eventId) => {
        await run(() => api.deleteEvent(eventId), async () => forgetEvent(eventId));
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
    [s, loading, busy, lastError, run, refresh, loadEvent, forgetEvent],
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

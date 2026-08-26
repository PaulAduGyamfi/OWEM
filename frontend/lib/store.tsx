/**
 * React binding over the mock backend in lib/api.ts.
 *
 * Screens never touch state directly — they call an action named after the
 * endpoint. Phase 2 keeps this file and swaps api.ts for a fetch client.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import * as api from './api.ts';
import type { Cents, PaymentMethod, TipPolicy } from './types.ts';

type Actions = {
  createEvent: (input: { title: string; place: string | null }) => string;
  addParticipant: (eventId: string, name: string) => void;
  removeParticipant: (participantId: string) => void;
  createReceipt: (eventId: string) => string;
  applyExtraction: (receiptId: string) => void;
  patchItem: (itemId: string, patch: { normalizedName?: string; quantity?: number; totalPrice?: Cents }) => void;
  confirmItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  addItem: (receiptId: string, input: { name: string; price: Cents }) => void;
  confirmAllItems: (receiptId: string) => void;
  setCharges: (receiptId: string, input: { tax?: Cents; tip?: Cents; discount?: Cents; tipPolicy?: TipPolicy }) => void;
  confirmReceipt: (receiptId: string) => void;
  putAssignments: (itemId: string, on: { participantId: string; weight: number }[]) => void;
  createSettlement: (eventId: string, reason?: string | null) => void;
  /** Set when the engine refused the inputs. Cleared on the next attempt. */
  lastError: string | null;
  clearError: () => void;
  createPayment: (eventId: string, participantId: string, amount: Cents, method: PaymentMethod) => void;
  closeEvent: (eventId: string) => void;
  reset: () => void;
};

type Store = { s: api.State } & Actions;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<api.State>(api.initialState);
  const [lastError, setLastError] = useState<string | null>(null);

  const value = useMemo<Store>(
    () => ({
      s,
      // These two need the new id back immediately, so they read the state in
      // the closure rather than an updater.
      createEvent: (input) => {
        const [next, id] = api.createEvent(s, input);
        setS(next);
        return id;
      },
      createReceipt: (eventId) => {
        const [next, id] = api.createReceipt(s, eventId);
        setS(next);
        return id;
      },
      addParticipant: (eventId, name) => setS((p) => api.addParticipant(p, eventId, name)),
      removeParticipant: (id) => setS((p) => api.removeParticipant(p, id)),
      applyExtraction: (receiptId) => setS((p) => api.applyExtraction(p, receiptId)),
      patchItem: (itemId, patch) => setS((p) => api.patchItem(p, itemId, patch)),
      confirmItem: (itemId) => setS((p) => api.confirmItem(p, itemId)),
      deleteItem: (itemId) => setS((p) => api.deleteItem(p, itemId)),
      addItem: (receiptId, input) => setS((p) => api.addItem(p, receiptId, input)),
      confirmAllItems: (receiptId) => setS((p) => api.confirmAllItems(p, receiptId)),
      setCharges: (receiptId, input) => setS((p) => api.setCharges(p, receiptId, input)),
      confirmReceipt: (receiptId) => setS((p) => api.confirmReceipt(p, receiptId)),
      putAssignments: (itemId, on) => setS((p) => api.putAssignments(p, itemId, on)),
      lastError,
      clearError: () => setLastError(null),
      /**
       * The engine throws by design when its inputs are not confirmed. Run it
       * outside the updater so the throw lands here and not in React's render
       * phase, where it would take the whole screen down.
       */
      createSettlement: (eventId, reason = null) => {
        try {
          const next = api.createSettlement(s, eventId, reason);
          setLastError(null);
          setS(next);
        } catch (e) {
          setLastError(e instanceof Error ? e.message : 'The balances could not be worked out.');
        }
      },
      createPayment: (eventId, pid, amount, method) =>
        setS((p) => api.createPayment(p, eventId, pid, amount, method)),
      closeEvent: (eventId) => setS((p) => api.closeEvent(p, eventId)),
      reset: () => { setLastError(null); setS(api.initialState()); },
    }),
    [s, lastError],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOwem(): Store {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useOwem must be used inside StoreProvider');
  return v;
}

/** Read helpers, so screens don't import api.ts directly for every lookup. */
export function useEvent(eventId: string) {
  const { s } = useOwem();
  return useMemo(() => {
    const event = s.events.find((e) => e.id === eventId);
    const receipt = api.receiptOf(s, eventId);
    return {
      event,
      receipt,
      participants: api.participantsOf(s, eventId),
      payer: api.payerOf(s, eventId),
      items: api.itemsOf(s, receipt?.id),
      settlement: api.latestSettlement(s, eventId),
      history: api.settlementHistory(s, eventId),
      payments: api.paymentsOf(s, eventId),
      summary: event ? api.summarise(s, eventId) : null,
    };
  }, [s, eventId]);
}

export { api };

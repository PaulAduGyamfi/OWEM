import { cents } from './money.ts';
import type {
  Assignment,
  Cents,
  Event,
  EventDetail,
  Participant,
  Settlement,
  SettlementLine,
} from './types.ts';

export type State = {
  events: Event[];
  details: Record<string, EventDetail>;
  settlements: Record<string, Settlement>;
  history: Record<string, Settlement[]>;
};


export type Summary = {
  event: Event;
  participants: Participant[];
  headcount: number;
  owedToPayer: Cents;
  collected: Cents;
  outstanding: Cents;
  settlement: Settlement | null;
};

export const EMPTY: State = { events: [], details: {}, settlements: {}, history: {} };

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

import type { Cents } from './types.ts';

export const cents = (n: number): Cents => {
  if (!Number.isInteger(n)) throw new Error(`cents() needs a whole number, got ${n}`);
  return n as Cents;
};

export const ZERO = cents(0);

export const add = (...xs: Cents[]): Cents => cents(xs.reduce((a, b) => a + b, 0));
export const sub = (a: Cents, b: Cents): Cents => cents(a - b);
export const sum = (xs: Cents[]): Cents => cents(xs.reduce<number>((a, b) => a + b, 0));

export function formatMoney(v: Cents, opts: { sign?: boolean } = {}): string {
  const neg = v < 0;
  const abs = Math.abs(v);
  const body = `$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  if (opts.sign) return `${neg ? '−' : '+'}${body}`;
  return neg ? `−${body}` : body;
}

export const formatAmount = (v: Cents): string =>
  `${Math.floor(Math.abs(v) / 100)}.${String(Math.abs(v) % 100).padStart(2, '0')}`;

export function parseAmount(text: string): Cents | null {
  const m = /^\s*\$?\s*(\d{1,9})(?:\.(\d{1,2}))?\s*$/.exec(text);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = (m[2] ?? '').padEnd(2, '0');
  return cents(whole * 100 + Number(frac));
}

export function allocate(total: Cents, weights: number[]): Cents[] {
  if (weights.length === 0) return [];
  if (weights.some((w) => w < 0)) throw new Error('allocate(): negative weight');

  const w = weights.map((x) => Math.round(x * 1000));
  const W = w.reduce((a, b) => a + b, 0);
  if (W === 0) throw new Error('allocate(): weights sum to zero');

  const base = w.map((wi) => Math.floor((total * wi) / W));
  const remainders = w.map((wi) => (total * wi) % W);
  let left = total - base.reduce((a, b) => a + b, 0);

  const order = base
    .map((_, i) => i)
    .sort((a, b) => remainders[b] - remainders[a] || w[b] - w[a] || a - b);

  for (const i of order) {
    if (left <= 0) break;
    base[i] += 1;
    left -= 1;
  }
  return base.map(cents);
}

export function assertSumsTo(parts: Cents[], total: Cents, what: string): void {
  const s = parts.reduce<number>((a, b) => a + b, 0);
  if (s !== total) {
    throw new Error(`${what}: parts sum to ${s}, expected ${total}. Off by ${s - total}.`);
  }
}

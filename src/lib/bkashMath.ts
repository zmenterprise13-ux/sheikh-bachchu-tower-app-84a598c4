// Centralized rounding rules for bKash payments.
// Ensures Due, Fee, and Total Payable always round consistently to 2 decimals.

export const round2 = (n: number): number => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export type BkashBreakdown = {
  due: number;    // base amount owed (rounded)
  fee: number;    // bkash service charge (rounded)
  total: number;  // due + fee (rounded, == amount user pays)
};

/**
 * Compute breakdown when the user enters the BASE due amount.
 * total = round2(due * (1 + feePct))
 * fee   = total - due  (so all three add up exactly)
 */
export function fromDue(due: number, feePct: number): BkashBreakdown {
  const d = round2(Number(due) || 0);
  const t = round2(d * (1 + (Number(feePct) || 0)));
  const f = round2(t - d);
  return { due: d, fee: f, total: t };
}

/**
 * Compute breakdown when only TOTAL paid is known (e.g. on receipt regeneration).
 * due = round2(total / (1 + feePct))
 * fee = total - due
 */
export function fromTotal(total: number, feePct: number): BkashBreakdown {
  const t = round2(Number(total) || 0);
  const d = round2(t / (1 + (Number(feePct) || 0)));
  const f = round2(t - d);
  return { due: d, fee: f, total: t };
}

/** Cash / non-bKash: no fee. */
export function noFee(amount: number): BkashBreakdown {
  const a = round2(Number(amount) || 0);
  return { due: a, fee: 0, total: a };
}

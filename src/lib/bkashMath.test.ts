import { describe, it, expect } from "vitest";
import { round2, fromDue, fromTotal, noFee } from "./bkashMath";

describe("round2", () => {
  it("rounds to 2 decimals", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.345)).toBe(2.35);
    expect(round2(0)).toBe(0);
    expect(round2(100)).toBe(100);
  });
  it("handles invalid input", () => {
    expect(round2(NaN as any)).toBeNaN();
    expect(round2(undefined as any)).toBeNaN();
  });
});

describe("fromDue (2% fee)", () => {
  const FEE = 0.02;

  it("computes due/fee/total that sum exactly", () => {
    const r = fromDue(1000, FEE);
    expect(r.due).toBe(1000);
    expect(r.fee).toBe(20);
    expect(r.total).toBe(1020);
    expect(round2(r.due + r.fee)).toBe(r.total);
  });

  it("rounds awkward amounts consistently", () => {
    const r = fromDue(1234.56, FEE);
    // total = 1234.56 * 1.02 = 1259.2512 → 1259.25
    expect(r.total).toBe(1259.25);
    expect(r.due).toBe(1234.56);
    expect(r.fee).toBe(round2(r.total - r.due));
    expect(round2(r.due + r.fee)).toBe(r.total);
  });

  it("handles zero due", () => {
    const r = fromDue(0, FEE);
    expect(r).toEqual({ due: 0, fee: 0, total: 0 });
  });

  it("handles zero fee percent", () => {
    const r = fromDue(500, 0);
    expect(r).toEqual({ due: 500, fee: 0, total: 500 });
  });
});

describe("fromTotal", () => {
  it("inverts fromDue within 2-decimal tolerance", () => {
    const FEE = 0.02;
    const forward = fromDue(2500, FEE);
    const back = fromTotal(forward.total, FEE);
    expect(back.total).toBe(forward.total);
    expect(round2(back.due + back.fee)).toBe(back.total);
  });

  it("always sums exactly", () => {
    const r = fromTotal(1000.01, 0.025);
    expect(round2(r.due + r.fee)).toBe(r.total);
  });
});

describe("noFee", () => {
  it("rounds and zeroes fee", () => {
    expect(noFee(199.999)).toEqual({ due: 200, fee: 0, total: 200 });
  });
});

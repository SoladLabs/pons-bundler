import { describe, expect, it } from "vitest";
import { amountIn, amountOut, quoteBuyPure } from "../src/quoting.js";

describe("curve quoting (pure)", () => {
  it("amountOut is constant product", () => {
    expect(amountOut(1_000n, 9_000n, 1_000_000n)).toBe((1_000n * 1_000_000n) / (9_000n + 1_000n));
  });

  it("buy fees come off the input", () => {
    const q = quoteBuyPure({
      quoteIn: 10_000n,
      quoteReserve: 1_000_000n,
      tokenReserve: 1_000_000n,
      sellable: 500_000n,
      feeBps: 100n,
      creatorTaxBps: 0n,
      rawSnipeBps: 0n,
    });
    expect(q.fee).toBe(100n);
    expect(q.snipeTax).toBe(0n);
    expect(q.tokensOut).toBeGreaterThan(0n);
  });

  it("caps snipe tax so the buyer nets at least 1%", () => {
    const q = quoteBuyPure({
      quoteIn: 10_000n,
      quoteReserve: 1_000_000n,
      tokenReserve: 1_000_000n,
      sellable: 500_000n,
      feeBps: 100n,
      creatorTaxBps: 0n,
      rawSnipeBps: 9_900n,
    });
    expect(q.snipeBps).toBe(9_800n);
    expect(q.snipeTax).toBe((10_000n * 9_800n) / 10_000n);
  });

  it("amountIn inverts amountOut on small trades", () => {
    const reserveIn = 1_000_000n;
    const reserveOut = 1_000_000n;
    const want = 100n;
    const inn = amountIn(want, reserveIn, reserveOut);
    const back = amountOut(inn, reserveIn, reserveOut);
    expect(back).toBeGreaterThanOrEqual(want);
  });
});

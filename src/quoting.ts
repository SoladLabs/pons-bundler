import { BPS } from "./addresses.js";

export const ceilDiv = (a: bigint, b: bigint): bigint => {
  if (b === 0n) throw new Error("division by zero");
  return (a + b - 1n) / b;
};

export const amountOut = (inAmount: bigint, reserveIn: bigint, reserveOut: bigint): bigint => {
  if (inAmount <= 0n) return 0n;
  return (inAmount * reserveOut) / (reserveIn + inAmount);
};

export const amountIn = (outAmount: bigint, reserveIn: bigint, reserveOut: bigint): bigint => {
  if (outAmount <= 0n) return 0n;
  if (outAmount >= reserveOut) throw new Error("output exceeds reserve");
  return (outAmount * reserveIn) / (reserveOut - outAmount) + 1n;
};

export type BuyQuoteInput = {
  quoteIn: bigint;
  quoteReserve: bigint;
  tokenReserve: bigint;
  sellable: bigint;
  feeBps: bigint;
  creatorTaxBps: bigint;
  rawSnipeBps: bigint;
};

export type BuyQuote = {
  tokensOut: bigint;
  spent: bigint;
  refund: bigint;
  fee: bigint;
  tax: bigint;
  snipeTax: bigint;
  snipeBps: bigint;
};

/** Official buy quote. Snipe tax is capped so the buyer always nets at least 1% of spend. */
export function quoteBuyPure(input: BuyQuoteInput): BuyQuote {
  let snipeBps = input.rawSnipeBps;
  if (snipeBps > 0n) {
    const maxSnipeBps = BPS - input.feeBps - input.creatorTaxBps - 100n;
    if (snipeBps > maxSnipeBps) snipeBps = maxSnipeBps < 0n ? 0n : maxSnipeBps;
  }

  let spent = input.quoteIn;
  const fee = (spent * input.feeBps) / BPS;
  const tax = (spent * input.creatorTaxBps) / BPS;
  const snipeTax = (spent * snipeBps) / BPS;
  const net = spent - fee - tax - snipeTax;
  let tokensOut = net > 0n ? amountOut(net, input.quoteReserve, input.tokenReserve) : 0n;

  if (tokensOut > input.sellable) {
    tokensOut = input.sellable;
    const netExact = amountIn(input.sellable, input.quoteReserve, input.tokenReserve);
    const denom = BPS - input.feeBps - input.creatorTaxBps - snipeBps;
    const grossed = denom <= 0n ? input.quoteIn : ceilDiv(netExact * BPS, denom);
    spent = grossed < input.quoteIn ? grossed : input.quoteIn;
  }

  return {
    tokensOut,
    spent,
    refund: input.quoteIn - spent,
    fee: (spent * input.feeBps) / BPS,
    tax: (spent * input.creatorTaxBps) / BPS,
    snipeTax: (spent * snipeBps) / BPS,
    snipeBps,
  };
}

export function minTokensOutFromQuote(quoteIn: bigint, tokensOut: bigint, slippageBps: bigint): bigint {
  if (quoteIn === 0n || tokensOut === 0n) return 0n;
  const slipped = (tokensOut * (BPS - slippageBps)) / BPS;
  return slipped > 0n ? slipped : 1n;
}

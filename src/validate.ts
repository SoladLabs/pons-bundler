import type { Address, Hex } from "viem";
import { getAddress, isAddress, zeroAddress } from "viem";
import { ZERO_ADDRESS, type TokenParams } from "./addresses.js";
import { PonsbotError } from "./errors.js";

export function requireAddress(value: string, label: string): Address {
  if (!isAddress(value)) {
    throw new PonsbotError("INVALID_PARAMS", `${label} is not a valid address`);
  }
  return getAddress(value);
}

export function isNativePair(pairToken: Address): boolean {
  return pairToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

export function assertExplicitFeeRecipient(recipient: Address): void {
  if (recipient.toLowerCase() === zeroAddress) {
    throw new PonsbotError(
      "ZERO_FEE_RECIPIENT",
      "launchAndBuy requires an explicit creatorFeeRecipient (zero is rejected).",
      { revertName: "ZeroAddress" },
    );
  }
}

export function randomSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}

export function assertTokenParams(params: TokenParams): void {
  if (params.name.trim() === "" || params.symbol.trim() === "") {
    throw new PonsbotError("INVALID_PARAMS", "Token name and symbol are required");
  }
  if (params.creatorTaxBps < 0 || params.creatorTaxBps > 10_000) {
    throw new PonsbotError("INVALID_PARAMS", "creatorTaxBps out of range");
  }
}

export function assertOneWalletDemo(extraExemptions: readonly string[] | undefined): void {
  if (extraExemptions !== undefined && extraExemptions.length > 0) {
    throw new PonsbotError(
      "INVALID_PARAMS",
      "Extra exempt wallets, funding, and fire-now orchestration ship in the paid pack: https://t.me/vladmeer67",
    );
  }
}

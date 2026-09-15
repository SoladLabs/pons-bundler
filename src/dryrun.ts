import type { Address } from "viem";
import { ZERO_ADDRESS } from "./addresses.js";

/** src/config/config.json uses this as launcher / recipient / fee recipient. */
export const EXAMPLE_PLACEHOLDER = "0x0000000000000000000000000000000000000001" as Address;

export const EDIT_AND_FUND =
  "Edit src/config/config.json + fund this wallet. Dry-run simulates from the launcher; put your deployer in launcher/recipient/creatorFeeRecipient and fund it before --live.";

export function isExamplePlaceholder(launcher: Address): boolean {
  const key = launcher.toLowerCase();
  return key === EXAMPLE_PLACEHOLDER.toLowerCase() || key === ZERO_ADDRESS.toLowerCase();
}

export function dryRunNextStep(input: {
  ok: boolean;
  launcher: Address;
  value: bigint;
  balance: bigint;
}): { next: string } {
  if (isExamplePlaceholder(input.launcher) || input.balance < input.value) {
    return { next: EDIT_AND_FUND };
  }
  if (input.ok) {
    return {
      next: "Call again with --live after PONSBOT_PRIVATE_KEY is in this folder's .env. Keys stay local.",
    };
  }
  return {
    next: `Simulated from ${input.launcher} and the call reverted. Edit src/config/config.json if launcher/recipient are still placeholders.`,
  };
}

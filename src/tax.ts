import type { Address } from "viem";
import { curveAbi } from "./abi.js";
import { createRobinhoodClient, type RobinhoodClient } from "./client.js";
import { PonsbotError } from "./errors.js";
import { getLaunchedToken } from "./launch.js";
import { requireAddress } from "./validate.js";

export type TaxMode = "exempt" | "wait";

export function taxMode(bps: bigint): TaxMode {
  return bps === 0n ? "exempt" : "wait";
}

export async function currentSnipeTaxBps(
  token: Address,
  wallet: Address,
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<bigint> {
  const launch = await getLaunchedToken(token, client);
  if (!launch.exists) {
    throw new PonsbotError("UNKNOWN_LAUNCH", "Token is not a launch of this factory");
  }
  return client.readContract({
    address: launch.curve,
    abi: curveAbi,
    functionName: "currentSnipeTaxBps",
    args: [requireAddress(wallet, "wallet")],
  });
}

export async function taxAdvice(
  token: Address,
  wallet: Address,
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<{ bps: bigint; mode: TaxMode; hint: string }> {
  const bps = await currentSnipeTaxBps(token, wallet, client);
  const mode = taxMode(bps);
  return {
    bps,
    mode,
    hint: mode === "exempt" ? "fire now — this wallet is 0% snipe tax" : "wait — a normal wallet still pays ~99%",
  };
}

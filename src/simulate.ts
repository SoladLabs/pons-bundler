import { type Account, BaseError, ContractFunctionRevertedError, type Hex } from "viem";
import type { UnsignedTx } from "./addresses.js";
import { createRobinhoodClient, type RobinhoodClient } from "./client.js";
import { codeFromRevertName, errorEnvelope } from "./errors.js";

export type SimulateOk = {
  ok: true;
  tx: UnsignedTx;
};

export type SimulateRevert = {
  ok: false;
  tx: UnsignedTx;
  revert: {
    code: string;
    message: string;
    revertName?: string;
    details?: Record<string, unknown>;
  };
};

export type SimulateResult = SimulateOk | SimulateRevert;

function extractRevert(error: unknown): SimulateRevert["revert"] {
  if (error instanceof BaseError) {
    const revert = error.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? revert.reason ?? "Revert";
      return {
        code: codeFromRevertName(name),
        message: revert.shortMessage,
        revertName: name,
      };
    }
    return { code: "REVERT", message: error.shortMessage };
  }
  const envelope = errorEnvelope(error);
  return {
    code: envelope.code,
    message: envelope.message,
    ...(envelope.revertName !== undefined ? { revertName: envelope.revertName } : {}),
  };
}

export async function simulateTx(
  tx: UnsignedTx,
  options: { account?: Account | Hex; client?: RobinhoodClient } = {},
): Promise<SimulateResult> {
  const client = options.client ?? createRobinhoodClient();
  try {
    await client.call({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      ...(options.account !== undefined ? { account: options.account } : {}),
    });
    return { ok: true, tx };
  } catch (error) {
    return { ok: false, tx, revert: extractRevert(error) };
  }
}

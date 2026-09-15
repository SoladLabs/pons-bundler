import type { UnsignedTx } from "./addresses.js";

export type JsonTx = {
  to: string;
  data: string;
  value: string;
  chainId: number;
};

export function txToJson(tx: UnsignedTx): JsonTx {
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value.toString(),
    chainId: tx.chainId,
  };
}

export function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

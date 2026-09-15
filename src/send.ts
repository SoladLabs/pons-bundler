import { type Chain, type Hex, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN_ID, PUBLIC_RPC, type UnsignedTx } from "./addresses.js";
import { createRobinhoodClient } from "./client.js";
import { PonsbotError } from "./errors.js";
import { simulateTx } from "./simulate.js";

function loadLocalAccount() {
  const pk = process.env.PONSBOT_PRIVATE_KEY;
  if (pk === undefined || pk === "") {
    throw new PonsbotError(
      "SIGNING_DISABLED",
      "No PONSBOT_PRIVATE_KEY in this machine's .env. Keys stay local. Never paste a key into a website.",
    );
  }
  const hex = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
  if (hex.length !== 66) {
    throw new PonsbotError("INVALID_PARAMS", "PONSBOT_PRIVATE_KEY is not a 32-byte hex key");
  }
  return privateKeyToAccount(hex);
}

function chainFromId(chainId: number): Chain {
  return {
    id: chainId,
    name: "Robinhood Chain",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [process.env.PONSBOT_RPC_URL ?? PUBLIC_RPC] },
    },
  };
}

/** Broadcast a previously built tx. Node-only. Always simulates first. */
export async function sendTx(tx: UnsignedTx): Promise<{ hash: Hex; simulated: true }> {
  const account = loadLocalAccount();
  const client = createRobinhoodClient();
  const simulated = await simulateTx(tx, { account: account.address, client });
  if (!simulated.ok) {
    throw new PonsbotError("REVERT", simulated.revert.message, {
      ...(simulated.revert.revertName !== undefined ? { revertName: simulated.revert.revertName } : {}),
    });
  }

  const wallet = createWalletClient({
    account,
    chain: chainFromId(tx.chainId ?? CHAIN_ID),
    transport: http(process.env.PONSBOT_RPC_URL ?? PUBLIC_RPC),
  });

  const hash = await wallet.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: tx.value,
    chain: chainFromId(tx.chainId ?? CHAIN_ID),
  });

  return { hash, simulated: true };
}

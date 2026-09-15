import { createPublicClient, http, type PublicClient } from "viem";
import { CHAIN_ID, PUBLIC_RPC } from "./addresses.js";

export type RobinhoodClient = PublicClient;

export type ClientOptions = {
  rpcUrl?: string;
  chainId?: number;
};

export function createRobinhoodClient(options: ClientOptions = {}): RobinhoodClient {
  const rpcUrl = options.rpcUrl ?? process.env.PONSBOT_RPC_URL ?? PUBLIC_RPC;
  const chainId = options.chainId ?? Number(process.env.PONSBOT_CHAIN_ID ?? CHAIN_ID);
  return createPublicClient({
    chain: {
      id: chainId,
      name: "Robinhood Chain",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
    transport: http(rpcUrl),
  });
}

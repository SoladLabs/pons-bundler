import type { Address, Hex } from "viem";

/** Robinhood Chain mainnet. */
export const CHAIN_ID = 4663;

export const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com" as const;

export const EXPLORER = "https://robinhoodchain.blockscout.com" as const;

export const BPS = 10_000n;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export const ADDRESSES = {
  factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as Address,
  router: "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948" as Address,
} as const;

export type UnsignedTx = {
  to: Address;
  data: Hex;
  value: bigint;
  chainId: number;
};

export type Socials = {
  twitter: string;
  telegram: string;
  discord: string;
  website: string;
  farcaster: string;
};

export type TokenParams = {
  name: string;
  symbol: string;
  logo: string;
  description: string;
  socials: Socials;
  creatorFeeRecipient: Address;
  creatorTaxBps: number;
  buybackEnabled: boolean;
  expectedEconomics: Hex;
  salt: Hex;
};

export type LaunchPhase = 0 | 1 | 2 | 3;

export type LaunchedToken = {
  token: Address;
  curve: Address;
  deployer: Address;
  creatorFeeRecipient: Address;
  pairToken: Address;
  graduationThreshold: bigint;
  poolFee: number;
  tickSpacing: number;
  creatorTaxBps: number;
  buybackEnabled: boolean;
  phase: LaunchPhase;
  sweptQuote: bigint;
  sweptTokens: bigint;
  sweptAt: bigint;
  exists: boolean;
};

export type LaunchConfig = {
  supply: bigint;
  curveFeeBps: bigint;
  phantomQuote: bigint;
  graduationThreshold: bigint;
  poolFee: number;
  tickSpacing: number;
  enabled: boolean;
};

export const emptySocials = (): Socials => ({
  twitter: "",
  telegram: "",
  discord: "",
  website: "",
  farcaster: "",
});

import { type Address, encodeFunctionData, type Hex } from "viem";
import { factoryAbi, routerAbi } from "./abi.js";
import {
  ADDRESSES,
  CHAIN_ID,
  emptySocials,
  type LaunchConfig,
  type LaunchedToken,
  type LaunchPhase,
  type TokenParams,
  type UnsignedTx,
  ZERO_ADDRESS,
} from "./addresses.js";
import { createRobinhoodClient, type RobinhoodClient } from "./client.js";
import { PonsbotError } from "./errors.js";
import { minTokensOutFromQuote, quoteBuyPure } from "./quoting.js";
import {
  assertExplicitFeeRecipient,
  assertOneWalletDemo,
  assertTokenParams,
  isNativePair,
  randomSalt,
  requireAddress,
} from "./validate.js";

export type BuildLaunchAndBuyInput = {
  params: Omit<TokenParams, "expectedEconomics" | "salt" | "socials"> & {
    socials?: TokenParams["socials"];
    expectedEconomics?: Hex;
    salt?: Hex;
  };
  launchConfigId: bigint;
  pairToken?: Address;
  quoteIn: bigint;
  minTokensOut: bigint;
  recipient: Address;
  launchFee: bigint;
  chainId?: number;
};

export type BuiltLaunchAndBuy = {
  tx: UnsignedTx;
  params: TokenParams;
  pairToken: Address;
  quoteIn: bigint;
  minTokensOut: bigint;
  recipient: Address;
  launchConfigId: bigint;
};

export function nativeLaunchValue(launchFee: bigint, quoteIn: bigint, pairToken: Address): bigint {
  return isNativePair(pairToken) ? launchFee + quoteIn : launchFee;
}

/** Extra exemption slots are not built here. */
export function buildLaunchAndBuy(input: BuildLaunchAndBuyInput): BuiltLaunchAndBuy {
  const pairToken = input.pairToken ?? ZERO_ADDRESS;
  const recipient = requireAddress(input.recipient, "recipient");
  const creatorFeeRecipient = requireAddress(input.params.creatorFeeRecipient, "creatorFeeRecipient");
  assertExplicitFeeRecipient(creatorFeeRecipient);

  const salt = input.params.salt ?? randomSalt();
  const expectedEconomics = input.params.expectedEconomics ?? ("0x".padEnd(66, "0") as Hex);
  const params: TokenParams = {
    ...input.params,
    socials: input.params.socials ?? emptySocials(),
    creatorFeeRecipient,
    expectedEconomics,
    salt,
  };
  assertTokenParams(params);

  if (input.quoteIn <= 0n) {
    throw new PonsbotError("INVALID_PARAMS", "quoteIn must be greater than 0");
  }

  const value = nativeLaunchValue(input.launchFee, input.quoteIn, pairToken);
  const data = encodeFunctionData({
    abi: routerAbi,
    functionName: "launchAndBuy",
    args: [params, input.launchConfigId, pairToken, input.quoteIn, input.minTokensOut, recipient, []],
  });

  return {
    tx: {
      to: ADDRESSES.router,
      data,
      value,
      chainId: input.chainId ?? CHAIN_ID,
    },
    params,
    pairToken,
    quoteIn: input.quoteIn,
    minTokensOut: input.minTokensOut,
    recipient,
    launchConfigId: input.launchConfigId,
  };
}

export async function canLaunch(
  launcher: Address,
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<boolean> {
  return client.readContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "canLaunch",
    args: [requireAddress(launcher, "launcher")],
  });
}

export async function readLaunchFee(client: RobinhoodClient = createRobinhoodClient()): Promise<bigint> {
  return client.readContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "launchFee",
  });
}

export async function previewLaunchEconomics(
  launchConfigId: bigint,
  pairToken: Address = ZERO_ADDRESS,
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<Hex> {
  return client.readContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "previewLaunchEconomics",
    args: [launchConfigId, pairToken],
  });
}

export async function openLaunchConfigs(
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<Array<LaunchConfig & { id: bigint }>> {
  const count = await client.readContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "launchConfigCount",
  });
  const configs = await Promise.all(
    Array.from({ length: Number(count) }, (_, id) =>
      client.readContract({
        address: ADDRESSES.factory,
        abi: factoryAbi,
        functionName: "getLaunchConfig",
        args: [BigInt(id)],
      }),
    ),
  );
  return configs.map((config, id) => ({ id: BigInt(id), ...config })).filter((config) => config.enabled);
}

export async function getLaunchedToken(
  token: Address,
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<LaunchedToken> {
  const launch = await client.readContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "getLaunchedToken",
    args: [requireAddress(token, "token")],
  });
  return {
    ...launch,
    phase: launch.phase as LaunchPhase,
  };
}

/** First-buy floor. The launchAndBuy recipient is auto-exempt, so snipe bps is 0. */
export async function quoteFirstBuyMinTokensOut(
  input: {
    launchConfigId: bigint;
    quoteIn: bigint;
    creatorTaxBps: number;
    slippageBps?: bigint;
  },
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<bigint> {
  const config = await client.readContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "getLaunchConfig",
    args: [input.launchConfigId],
  });
  const quote = quoteBuyPure({
    quoteIn: input.quoteIn,
    quoteReserve: config.phantomQuote,
    tokenReserve: config.supply,
    sellable: config.supply,
    feeBps: config.curveFeeBps,
    creatorTaxBps: BigInt(input.creatorTaxBps),
    rawSnipeBps: 0n,
  });
  const minOut = minTokensOutFromQuote(quote.spent, quote.tokensOut, input.slippageBps ?? 50n);
  if (minOut <= 1n) {
    throw new PonsbotError(
      "INVALID_PARAMS",
      "Could not size minTokensOut from the launch config. Check quoteIn and slippage.",
    );
  }
  return minOut;
}

export async function prepareLaunchAndBuy(
  input: Omit<BuildLaunchAndBuyInput, "launchFee" | "params"> & {
    params: BuildLaunchAndBuyInput["params"];
    launcher: Address;
    extraExemptions?: readonly string[];
  },
  client: RobinhoodClient = createRobinhoodClient(),
): Promise<BuiltLaunchAndBuy> {
  assertOneWalletDemo(input.extraExemptions);
  const pairToken = input.pairToken ?? ZERO_ADDRESS;
  const allowed = await canLaunch(requireAddress(input.launcher, "launcher"), client);
  if (!allowed) {
    throw new PonsbotError("NOT_WHITELISTED", "canLaunch(deployer) is false. Public launches are gated; do not send.", {
      revertName: "NotWhitelisted",
    });
  }

  const [launchFee, expectedEconomics] = await Promise.all([
    readLaunchFee(client),
    previewLaunchEconomics(input.launchConfigId, pairToken, client),
  ]);

  return buildLaunchAndBuy({
    ...input,
    launchFee,
    params: {
      ...input.params,
      expectedEconomics,
    },
  });
}

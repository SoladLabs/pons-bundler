#!/usr/bin/env node
/**
 * Public demo CLI. Default is dry-run.
 * --live signs with PONSBOT_PRIVATE_KEY from this machine's .env only.
 */
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { Address } from "viem";
import { createRobinhoodClient } from "./client.js";
import { dryRunNextStep } from "./dryrun.js";
import { PonsbotError } from "./errors.js";
import { jsonReplacer, txToJson } from "./json.js";
import {
  canLaunch,
  openLaunchConfigs,
  prepareLaunchAndBuy,
  quoteFirstBuyMinTokensOut,
} from "./launch.js";
import { sendTx } from "./send.js";
import { simulateTx } from "./simulate.js";
import { normalizeSocials } from "./socials.js";
import { currentSnipeTaxBps, taxAdvice } from "./tax.js";

type LaunchFile = {
  name: string;
  symbol: string;
  logo?: string;
  description?: string;
  socials?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
    farcaster?: string;
  };
  creatorFeeRecipient: Address;
  launcher?: Address;
  creatorTaxBps?: number;
  buybackEnabled?: boolean;
  launchConfigId?: string | number;
  quoteIn: string;
  minTokensOut?: string;
  slippageBps?: number;
  recipient: Address;
  snipeTaxExemptions?: string[];
};

function loadDotEnv(): void {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function die(error: unknown): never {
  if (error instanceof PonsbotError) {
    console.error(JSON.stringify({ error: { code: error.code, message: error.message } }, null, 2));
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
}

async function loadLaunch(path: string): Promise<LaunchFile> {
  return JSON.parse(await readFile(path, "utf8")) as LaunchFile;
}

async function maybeSend(tx: Parameters<typeof simulateTx>[0], launcher: Address): Promise<void> {
  if (!flag("--live")) {
    const client = createRobinhoodClient();
    const [sim, balance] = await Promise.all([
      simulateTx(tx, { account: launcher, client }),
      client.getBalance({ address: launcher }),
    ]);
    const { next } = dryRunNextStep({ ok: sim.ok, launcher, value: tx.value, balance });
    console.log(
      JSON.stringify(
        {
          from: launcher,
          value: tx.value.toString(),
          balance: balance.toString(),
          simulated: sim.ok ? { ok: true } : { ok: false, revert: sim.revert.message },
          next,
          tx: txToJson(tx),
        },
        jsonReplacer,
        2,
      ),
    );
    return;
  }
  const sent = await sendTx(tx);
  console.log(JSON.stringify({ hash: sent.hash, simulated: true }, null, 2));
}

function help(): void {
  console.log(`pons-bundler — Pons V2 CLI on Robinhood Chain

  pons index
  pons can-launch <addr>
  pons tax --token <addr> --wallet <addr>
  pons preview --config src/config/config.json
  pons launch --config src/config/config.json [--live]

Default is simulate only. --live uses PONSBOT_PRIVATE_KEY from this folder's .env.

One wallet. Extra exempt wallets: https://t.me/vladmeer67
Unofficial. Not affiliated with Pons or Robinhood.`);
}

async function main(): Promise<void> {
  loadDotEnv();
  const cmd = process.argv[2];
  if (cmd === undefined || cmd === "help" || cmd === "--help") {
    help();
    return;
  }

  if (cmd === "index") {
    const configs = await openLaunchConfigs();
    console.log(
      JSON.stringify(
        {
          factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
          configs: configs.map((row) => ({
            id: row.id.toString(),
            supply: row.supply.toString(),
            phantomQuote: row.phantomQuote.toString(),
            graduationThreshold: row.graduationThreshold.toString(),
            curveFeeBps: row.curveFeeBps.toString(),
            enabled: row.enabled,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (cmd === "can-launch") {
    const addr = process.argv[3] as Address | undefined;
    if (addr === undefined) throw new PonsbotError("INVALID_PARAMS", "address required");
    const ok = await canLaunch(addr);
    console.log(JSON.stringify({ address: addr, canLaunch: ok }));
    return;
  }

  if (cmd === "tax") {
    const token = arg("--token") as Address | undefined;
    const wallet = arg("--wallet") as Address | undefined;
    if (token === undefined || wallet === undefined) {
      throw new PonsbotError("INVALID_PARAMS", "--token --wallet required");
    }
    const advice = await taxAdvice(token, wallet);
    const bps = await currentSnipeTaxBps(token, wallet);
    console.log(
      JSON.stringify(
        {
          bps: bps.toString(),
          pct: `${Number(bps) / 100}%`,
          mode: advice.mode,
          hint: advice.hint,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (cmd === "preview" || cmd === "launch") {
    const configPath = arg("--config");
    if (configPath === undefined) throw new PonsbotError("INVALID_PARAMS", "--config required");
    const file = await loadLaunch(configPath);
    const built = await prepareLaunchAndBuy({
      launcher: file.launcher ?? file.creatorFeeRecipient,
      launchConfigId: BigInt(file.launchConfigId ?? 0),
      quoteIn: BigInt(file.quoteIn),
      minTokensOut:
        file.minTokensOut !== undefined
          ? BigInt(file.minTokensOut)
          : await quoteFirstBuyMinTokensOut({
              launchConfigId: BigInt(file.launchConfigId ?? 0),
              quoteIn: BigInt(file.quoteIn),
              creatorTaxBps: file.creatorTaxBps ?? 0,
              slippageBps: BigInt(file.slippageBps ?? 50),
            }),
      recipient: file.recipient,
      ...(file.snipeTaxExemptions !== undefined ? { extraExemptions: file.snipeTaxExemptions } : {}),
      params: {
        name: file.name,
        symbol: file.symbol,
        logo: file.logo ?? "",
        description: file.description ?? "",
        socials: normalizeSocials(file.socials),
        creatorFeeRecipient: file.creatorFeeRecipient,
        creatorTaxBps: file.creatorTaxBps ?? 0,
        buybackEnabled: file.buybackEnabled ?? true,
      },
    });
    if (cmd === "preview") {
      console.log(
        JSON.stringify(
          {
            tx: txToJson(built.tx),
            recipient: built.recipient,
            value: built.tx.value.toString(),
            note: "Recipient is auto-exempt. Extra wallets are the paid pack.",
          },
          jsonReplacer,
          2,
        ),
      );
      return;
    }
    await maybeSend(built.tx, file.launcher ?? file.creatorFeeRecipient);
    return;
  }

  throw new PonsbotError("INVALID_PARAMS", `unknown command: ${cmd}`);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch(die);
}

# Pons Bundler

Pons V2 Bundler Bot for Robinhood Chain. This Pons V2 bundler bot indexes Pons factory launches on Robinhood, quotes the Pons snipe tax, and runs a Robinhood Pons launchAndBuy bundler bot on Robinhood. Robinhood Pons bundler bot for Pons token launches on Robinhood Chain. Unofficial Robinhood Pons bundler bot, not affiliated with Pons or Robinhood.

**Repository:** [github.com/SoladLabs/pons-bundler](https://github.com/SoladLabs/pons-bundler)

This project is unofficial and is not affiliated with Pons or Robinhood.

## Overview

Pons V2 applies a decaying snipe tax (`currentSnipeTaxBps`) at the start of a launch. A wallet that is not exempt can pay approximately 99% of spend during the first seconds.

`launchAndBuy` creates the token and executes the first buy in one transaction. The buy recipient is auto-exempt (0 bps). Extra exemption wallets, funding, and same-block orchestration are available via Telegram.

Public creates are gated by `canLaunch(deployer)`. Native launches must send `msg.value = launchFee + quoteIn`.

## Requirements

- Node.js 22 or later
- Robinhood Chain RPC access (public endpoint is used by default)
- A funded deployer that passes `canLaunch` if you intend to broadcast

## Installation

```bash
git clone https://github.com/SoladLabs/pons-bundler.git
cd pons-bundler
pnpm install
pnpm test
cp .env.example .env
```

`npm` and `yarn` are also supported.

Signing keys stay in the local `.env`. Do not commit `.env` or paste a private key into a website.

## Configuration

Launch parameters live in [`src/config/config.json`](src/config/config.json). Replace the placeholder addresses before a live send.

| Field | Description |
| --- | --- |
| `name`, `symbol` | Token metadata |
| `logo`, `description`, `socials` | Optional listing fields |
| `launcher` | Deployer that must pass `canLaunch` |
| `creatorFeeRecipient` | Explicit fee recipient (zero address is rejected) |
| `recipient` | First-buy wallet; auto-exempt from snipe tax |
| `launchConfigId` | Factory launch config index |
| `quoteIn` | First-buy size in wei |
| `slippageBps` | Slippage used when `minTokensOut` is omitted |
| `creatorTaxBps` | Creator tax in basis points |
| `buybackEnabled` | Buyback flag passed to the factory |

Environment variables (see [`.env.example`](.env.example)):

| Variable | Description |
| --- | --- |
| `PONSBOT_RPC_URL` | RPC endpoint (default: `https://rpc.mainnet.chain.robinhood.com`) |
| `PONSBOT_CHAIN_ID` | Chain id (default: `4663`) |
| `PONSBOT_PRIVATE_KEY` | Local signer for `--live` only |

## CLI

```text
pons index
pons can-launch <address>
pons tax --token <address> --wallet <address>
pons preview --config src/config/config.json
pons launch --config src/config/config.json [--live]
```

| Command | Description |
| --- | --- |
| `index` | List enabled factory launch configs |
| `can-launch` | Check whether an address is allowed to create |
| `tax` | Read `currentSnipeTaxBps` and report exempt vs wait |
| `preview` | Encode an unsigned `launchAndBuy` |
| `launch` | Simulate from the launcher; add `--live` to sign locally |

The default mode is simulation. `--live` spends real Robinhood Chain ETH and will revert unless `canLaunch(deployer)` is true.

## Usage

```bash
pnpm pons index
pnpm pons can-launch 0xYourDeployer

pnpm pons tax --token 0xLaunchedToken --wallet 0xExemptRecipient
pnpm pons tax --token 0xLaunchedToken --wallet 0xRandomWallet

pnpm pons preview --config src/config/config.json
pnpm pons launch --config src/config/config.json
```

After a successful launch, the named recipient should read **0 bps**. A wallet that was not the buy recipient typically reads **~9900 bps** until the tax decays (about 3 seconds).

## Project structure

```text
src/cli.ts             Command-line entry
src/launch.ts          Factory reads and launchAndBuy encoding
src/tax.ts             currentSnipeTaxBps helper
src/quoting.ts         Bonding-curve buy quote
src/config/config.json Launch parameters
```

## Scope

This repository covers factory indexing, tax readout, dry-run, and optional local send.

It does not include extra-wallet generation, funding, fire, or sweep; Telegram automation; hosted signing; or commercial desk presets.

For multi-wallet support, contact [t.me/vladmeer67](https://t.me/vladmeer67).

## License

See [`LICENSE`](LICENSE). This is a research build. Commercial use as a bundler, hosted desk, or Telegram resale requires a paid license.

## Contact

- Telegram: [t.me/vladmeer67](https://t.me/vladmeer67)
- X: [@vladmeer67](https://x.com/vladmeer67)
- Issues: [SoladLabs/pons-bundler](https://github.com/SoladLabs/pons-bundler/issues)

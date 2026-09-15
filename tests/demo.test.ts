import { encodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";
import { routerAbi } from "../src/abi.js";
import { ADDRESSES } from "../src/addresses.js";
import { dryRunNextStep, EDIT_AND_FUND } from "../src/dryrun.js";
import { PonsbotError } from "../src/errors.js";
import { buildLaunchAndBuy, nativeLaunchValue } from "../src/launch.js";
import { taxMode } from "../src/tax.js";
import { assertOneWalletDemo } from "../src/validate.js";

const wallet = "0x0000000000000000000000000000000000000001" as const;

describe("demo", () => {
  it("tells an unfunded or placeholder dry-run to edit config.json and fund the launcher", () => {
    expect(
      dryRunNextStep({
        ok: false,
        launcher: wallet,
        value: 1_500_000_000_000_000n,
        balance: 0n,
      }).next,
    ).toBe(EDIT_AND_FUND);
    expect(
      dryRunNextStep({
        ok: true,
        launcher: wallet,
        value: 1_500_000_000_000_000n,
        balance: 10n ** 18n,
      }).next,
    ).toContain("Edit src/config/config.json + fund this wallet");
  });

  it("treats 0 bps as exempt and anything else as wait", () => {
    expect(taxMode(0n)).toBe("exempt");
    expect(taxMode(9900n)).toBe("wait");
  });

  it("rejects extra exemption wallets and points to Telegram", () => {
    expect(() => assertOneWalletDemo(["0x0000000000000000000000000000000000000002"])).toThrow(PonsbotError);
    try {
      assertOneWalletDemo(["0x0000000000000000000000000000000000000002"]);
    } catch (error) {
      expect(error).toBeInstanceOf(PonsbotError);
      expect((error as PonsbotError).message).toContain("t.me/vladmeer67");
    }
  });

  it("builds launchAndBuy with an empty exemption list", () => {
    const built = buildLaunchAndBuy({
      launchConfigId: 0n,
      quoteIn: 1_000_000_000_000_000n,
      minTokensOut: 1n,
      recipient: wallet,
      launchFee: 0n,
      params: {
        name: "Demo",
        symbol: "DEMO",
        logo: "",
        description: "",
        creatorFeeRecipient: wallet,
        creatorTaxBps: 0,
        buybackEnabled: true,
      },
    });
    expect(built.tx.to).toBe(ADDRESSES.router);
    expect(built.recipient).toBe(wallet);
    expect(nativeLaunchValue(0n, 1_000_000_000_000_000n, built.pairToken)).toBe(1_000_000_000_000_000n);

    const decoded = encodeFunctionData({
      abi: routerAbi,
      functionName: "launchAndBuy",
      args: [
        built.params,
        built.launchConfigId,
        built.pairToken,
        built.quoteIn,
        built.minTokensOut,
        built.recipient,
        [],
      ],
    });
    expect(built.tx.data).toBe(decoded);
  });
});

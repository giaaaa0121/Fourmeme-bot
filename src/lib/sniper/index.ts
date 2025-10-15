import fs from "fs";
import path from "path";
import { Contract, parseEther } from "ethers";
import { TContext } from "../../utils/types";
import { ROUTER_ADDRESS, WBNB_ADDRESS } from "../../utils/address";
import { ROUTER_ABI } from "../../utils/abi";
import { BaseContract } from "../base";
import { logError, logInfo, logWarn } from "../../utils/logger";

type Target = {
  token: string;
  maxBnb?: string;
  slippageBips?: number;
};

type SniperConfig = {
  targets?: Target[];
};

type BuyOpts = {
  tokenAddress: string;
  maxBnb: string; // e.g. "0.05"
  slippageBips: number;
  retries?: number;
  timeoutMs?: number; // optional tx wait timeout
  gasLimitBufferBips?: number; // buffer for estimated gas, default 20% -> 2000 bips
};

const DEFAULT_RETRIES = 3;
const DEFAULT_GAS_LIMIT_BUFFER_BIPS = 2000; // +20%

export class Sniper extends BaseContract {
  constructor(ctx: TContext) {
    super(ctx.wallet, ctx.provider, ctx.simulationOnly);
  }

  private safeParseJson<T>(text: string): T | null {
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      logError("Failed to parse JSON:", err);
      return null;
    }
  }

  async run() {
    const resolved = path.resolve(process.cwd(), "config.sniper.json");
    const raw = fs.readFileSync(resolved, "utf-8");

    const cfg = this.safeParseJson<SniperConfig>(raw);
    if (!cfg || !Array.isArray(cfg.targets)) {
      logWarn("No valid targets found in config.sniper.json");
      return;
    }

    for (const t of cfg.targets) {
      // Validate minimal required field
      if (!t?.token) {
        logWarn("Skipping invalid target (missing token):", t);
        continue;
      }

      const maxBnb = t.maxBnb ?? "0.05";
      const slippage =
        typeof t.slippageBips === "number" ? t.slippageBips : 800;

      try {
        await this.buyToken(t.token, maxBnb, slippage);
      } catch (buyErr) {
        logError(`buyToken failed for ${t.token}:`, buyErr);
        // Decide: continue on error (current behaviour) or rethrow
      }
    }
  }

  private async buyToken(
    tokenAddress: string,
    maxBnb: string,
    slippageBips: number,
    opts: { retries?: number; timeoutMs?: number } = {}
  ) {
    const retries = opts.retries ?? DEFAULT_RETRIES;
    const gasLimitBufferBips = DEFAULT_GAS_LIMIT_BUFFER_BIPS;

    // --- Validate inputs early ---
    if (!tokenAddress || typeof tokenAddress !== "string") {
      throw new TypeError("tokenAddress must be a non-empty string");
    }
    if (isNaN(Number(maxBnb)) || Number(maxBnb) <= 0) {
      throw new TypeError("maxBnb must be a positive numeric string");
    }
    if (
      !Number.isInteger(slippageBips) ||
      slippageBips < 0 ||
      slippageBips > 10_000
    ) {
      throw new TypeError(
        "slippageBips must be an integer between 0 and 10000"
      );
    }

    // parse value to bigint
    const value = parseEther(maxBnb);
    const path = [WBNB_ADDRESS, tokenAddress];
    const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, this.wallet);

    // helper: compute minOut safely using bigint
    const computeMinOut = (expectedOut: bigint, slippage: number) => {
      // minOut = expectedOut * (1 - slippage/10000)
      return expectedOut - (expectedOut * BigInt(slippage)) / BigInt(10_000);
    };

    // helper: single attempt
    const attemptOnce = async () => {
      // check wallet balance (value + small gas estimate)
      if (this.provider && typeof this.provider.getBalance === "function") {
        try {
          const balance = await this.provider.getBalance(this.wallet.address);
          if (balance < value) {
            throw new Error(
              "Insufficient wallet balance to cover value for swap"
            );
          }
        } catch (err) {
          // swallow provider balance failure — not fatal, but log
          logWarn("Could not confirm wallet balance:", (err as Error).message);
        }
      }

      // getAmountsOut -> may throw
      const amounts: bigint[] = await router.getAmountsOut(value, path);
      if (!Array.isArray(amounts) || amounts.length < 2) {
        throw new Error("Invalid router response or non-liquid pair");
      }

      const expectedOut = amounts[amounts.length - 1];
      const minOut = computeMinOut(expectedOut, slippageBips);

      logInfo("sniper: prepared swap", {
        tokenAddress,
        maxBnb,
        expectedOut: expectedOut.toString(),
        minOut: minOut.toString(),
      });

      if (this.simulationOnly) {
        logInfo("SimulationOnly is enabled — not sending transaction");
        return { simulationOnly: true };
      }

      // try gas estimate (best-effort)
      let gasLimit: bigint | undefined;
      try {
        const estimated = await this.estimateGas(
          router.swapExactETHForTokens(
            minOut,
            path,
            this.wallet.address,
            Math.floor(Date.now() / 1000) + 180,
            { value }
          )
        );
        // apply small buffer
        gasLimit =
          (BigInt(estimated.toString()) * BigInt(10000 + gasLimitBufferBips)) /
          BigInt(10000);
      } catch (err) {
        logWarn(
          "Gas estimation failed, using provider fallback or letting provider pick gasLimit:",
          (err as Error).message
        );
      }

      const deadline = Math.floor(Date.now() / 1000) + 180;

      const txRequest: any = {
        value,
        // include gasLimit only if estimated
        ...(gasLimit ? { gasLimit } : {}),
      };

      const tx = await router.swapExactETHForTokens(
        minOut,
        path,
        this.wallet.address,
        deadline,
        txRequest
      );
      logInfo("sniper: tx sent", { hash: tx.hash });

      // wait for confirmation
      tx.wait();

      return { dryRun: this.simulationOnly, txHash: tx.hash };
    };

    // --- Retries with exponential backoff ---
    let attempt = 0;
    let lastErr: any = null;
    while (attempt <= retries) {
      try {
        return await attemptOnce();
      } catch (err) {
        lastErr = err;
        attempt++;
        const shouldRetry =
          attempt <= retries &&
          // don't retry for clearly fatal errors
          !/Insufficient wallet balance|Missing token|invalid address/i.test(
            (err as Error).message
          );

        logWarn(
          `sniper: buyToken attempt ${attempt} failed:`,
          (err as Error).message
        );
        if (!shouldRetry) break;

        // exponential backoff: 500ms * 2^(attempt-1)
        const backoff = 500 * 2 ** (attempt - 1);
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }
    }

    // If we reach here, all attempts failed
    throw lastErr ?? new Error("buyToken failed with unknown error");
  }
}

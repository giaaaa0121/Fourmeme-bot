import fs from "fs";
import path from "path";
import { Contract, ethers, parseEther } from "ethers";
import { TContext } from "../../utils/types";
import { BaseContract } from "../base";
import { safeParseJson } from "../../utils/json";
import { logError, logInfo, logWarn } from "../../utils/logger";
import { ROUTER_ADDRESS, WBNB_ADDRESS } from "../../utils/address";
import { ROUTER_ABI } from "../../utils/abi";

type Route = {
  kind: "buy" | "sell";
  token: string;
  amountBnb?: string;
  slippageBips?: number;
  deadlineSec?: number;
};

type BundlerConfig = {
  routes?: Route[];
};

export class Bundler extends BaseContract {
  private readonly configPath = path.resolve(
    process.cwd(),
    "config.bundler.json"
  );
  constructor(private readonly ctx: TContext) {
    super(ctx.wallet, ctx.provider, ctx.simulationOnly);
  }

  /**
   * Entrypoint — reads config and executes defined routes sequentially.
   */
  async run() {
    const raw = fs.readFileSync(this.configPath, "utf-8");

    const cfg = safeParseJson<BundlerConfig>(raw);

    if (!cfg || !Array.isArray(cfg.routes)) {
      logWarn("⚠️ No valid routes found in config.bundler.json");
      return;
    }

    for (const route of cfg.routes) {
      // Validate minimal required field
      if (!route.token) {
        logWarn("⏭️ Skipping route: missing token address", route);
        continue;
      }

      try {
        await this.executeRoute(route);
      } catch (err) {
        logError(`❌ Failed to execute route for ${route.token}:`, err);
      }
    }
  }

  /**
   * Executes a single route (currently supports `buy` only).
   */
  private async executeRoute(route: Route): Promise<void> {
    const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, this.wallet);
    const amountBnb = route.amountBnb ?? "0.01";
    const slippage = route.slippageBips ?? 800;
    const deadline = Math.floor(Date.now() / 1000) + (route.deadlineSec ?? 300);

    switch (route.kind) {
      case "buy":
        await this.executeBuy(
          router,
          route.token,
          amountBnb,
          slippage,
          deadline
        );
        break;
      default:
        logWarn(`Unsupported route kind: ${route.kind}`);
        break;
    }
  }

  /**
   * Executes a buy route using WBNB → token path.
   */
  private async executeBuy(
    router: Contract,
    tokenAddress: string,
    amountBnb: string,
    slippageBips: number,
    deadline: number
  ): Promise<void> {
    const value = parseEther(amountBnb);

    let amounts: bigint[];
    try {
      amounts = await router.getAmountsOut(value, [WBNB_ADDRESS, tokenAddress]);
    } catch (err) {
      throw new Error(`Failed to fetch amountsOut for ${tokenAddress}: ${err}`);
    }

    if (!amounts?.length || amounts.length < 2) {
      throw new Error(
        `Invalid pair or insufficient liquidity for ${tokenAddress}`
      );
    }

    const expectedOut = amounts[1];
    const minOut =
      expectedOut - (expectedOut * BigInt(slippageBips)) / BigInt(10_000);

    logInfo("🛒 Executing buy", {
      token: tokenAddress,
      amountBnb,
      minOut: minOut.toString(),
    });

    if (this.simulationOnly) {
      logInfo("Simulation mode enabled — skipping transaction broadcast.");
      return;
    }

    const tx = await router.swapExactETHForTokens(
      minOut,
      [WBNB_ADDRESS, tokenAddress],
      this.wallet.address,
      deadline,
      { value }
    );

    logInfo(`✅ Buy tx sent: ${tx.hash}`);
    await tx.wait();
    logInfo(`🎉 Buy confirmed for ${tokenAddress}`);
  }
}

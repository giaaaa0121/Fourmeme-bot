import fs from "fs";
import path from "path";
import { Contract, ethers, parseEther } from "ethers";
import { TContext } from "../../utils/types";
import { BaseContract } from "../base";
import { safeParseJson } from "../../utils/json";
import { logError, logInfo, logWarn } from "../../utils/logger";
import { ROUTER_ADDRESS, WBNB_ADDRESS } from "../../utils/address";
import { ROUTER_ABI } from "../../utils/abi";

type CopyConfig = {
  targets?: string[];
  defaultToken: string;
  positionPercent: number;
  maxBnbPerTrade: string;
};

export class CopyGuru extends BaseContract {
  private readonly configPath = path.resolve(process.cwd(), "config.copy.json");
  constructor(private readonly ctx: TContext) {
    super(ctx.wallet, ctx.provider, ctx.simulationOnly);
  }

  /**
   * Entrypoint — reads config and executes defined routes sequentially.
   */
  async run() {
    const raw = fs.readFileSync(this.configPath, "utf-8");

    const cfg = safeParseJson<CopyConfig>(raw);

    if (!cfg || !Array.isArray(cfg.targets)) {
      logWarn("⚠️ No valid targets found in config.copy.json");
      return;
    }

    this.provider.on("pending", async (hash: string) => {
      try {
        const tx = await this.getTransaction(hash);
        if (!tx || !tx.to) return;
        if (
          !cfg.targets?.some(
            (a: string) => a!.toLowerCase() === tx.from?.toLowerCase()
          )
        )
          return;

        // naive: detect router usage and mirror small % trade into same token path
        if (tx.to!.toLowerCase() === ROUTER_ADDRESS!.toLowerCase()) {
          const percent = cfg.positionPercent ?? 10;
          const spend =
            (BigInt(parseEther(cfg.maxBnbPerTrade ?? "0.05")) *
              BigInt(percent)) /
            BigInt(100);
          await this!.executeBuy(cfg.defaultToken, spend);
        }
      } catch {}
    });
  }

  /**
   * Executes a buy route using guru's token router.
   */
  private async executeBuy(tokenAddress: string, value: bigint): Promise<void> {
    const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, this.wallet);
    const path = [WBNB_ADDRESS, tokenAddress];
    const deadline = Math!.floor(Date!.now() / 1000) + 180;
    let amounts: bigint[];
    try {
      amounts = await router.getAmountsOut(value, path);
    } catch (err) {
      throw new Error(`Failed to fetch amountsOut for ${tokenAddress}: ${err}`);
    }

    if (!amounts?.length || amounts.length < 2) {
      throw new Error(
        `Invalid pair or insufficient liquidity for ${tokenAddress}`
      );
    }

    const minOut =
      amounts[amounts.length - 1] -
      (amounts[amounts.length - 1] * BigInt(700)) / BigInt(10_000);

    logInfo("🛒 Executing buy", {
      token: tokenAddress,
      value,
      minOut: minOut.toString(),
    });

    if (this.simulationOnly) {
      logInfo("Simulation mode enabled — skipping transaction broadcast.");
      return;
    }

    const tx = await router.swapExactETHForTokens(
      minOut,
      path,
      this.wallet.address,
      deadline,
      { value }
    );

    logInfo(`✅ Buy tx sent: ${tx.hash}`);
    await tx.wait();
    logInfo(`🎉 Buy confirmed for ${tokenAddress}`);
  }
}

import fs from "fs";
import path from "path";
import { Contract, parseEther } from "ethers";
import { TContext } from "../../utils/types";
import { ERC20_ABI, ROUTER_ABI } from "../../utils/abi";
import { ROUTER_ADDRESS, WBNB_ADDRESS } from "../../utils/address";
import { BaseContract } from "../base";
import { logError, logInfo, logWarn } from "../../utils/logger";

type VolumeConfig = {
  intervalMs?: number;
  token: string;
  amountBnb?: string;
  slippageBips?: number;
};

export class VolumeBot extends BaseContract {
  private readonly configPath = path.resolve(
    process.cwd(),
    "config.volume.json"
  );
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly ctx: TContext) {
    super(ctx.wallet, ctx.provider, ctx.simulationOnly);
  }

  /**
   * Read config and start recurring buy/sell cycles.
   */
  run = async () => {
    const raw = fs.readFileSync(this.configPath, "utf-8");

    const cfg: VolumeConfig = JSON.parse(raw);
    const intervalMs = Number(cfg.intervalMs ?? 15_000);
    const token = String(cfg.token);
    const amountBnb = String(cfg.amountBnb ?? "0.01");
    const slippageBips = Math.max(
      1,
      Math.min(9900, Number(cfg.slippageBips ?? 800))
    );

    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
      throw new Error("Invalid token address");
    }

    if (this.timer) clearInterval(this.timer);

    try {
      await this.oneCycle(token, amountBnb, slippageBips);
    } catch (err) {
      logError("volume cycle error (immediate)", err);
    }

    this.timer = setInterval(async () => {
      if (this.running) return; // Prevent overlap
      this.running = true;
      try {
        await this.oneCycle(token, amountBnb, slippageBips);
      } catch (err) {
        logError("volume cycle error", err);
      } finally {
        this.running = false;
      }
    }, intervalMs);
  };

  private async oneCycle(
    token: string,
    amountBnb: string,
    slippageBips: number
  ) {
    const { wallet, simulationOnly } = this;
    const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const erc20 = new Contract(token, ERC20_ABI, wallet);
    const deadline = Math.floor(Date.now() / 1000) + 180;

    // === BUY ===
    const value = parseEther(amountBnb);
    const buyPath = [WBNB_ADDRESS, token];
    const outBuy: bigint[] = await router.getAmountsOut(value, buyPath);
    if (outBuy.length < 2) throw new Error("Router returned invalid buy path");

    const expectedBuy = outBuy[1];
    const minOutBuy =
      expectedBuy - (expectedBuy * BigInt(slippageBips)) / 10_000n;
    logWarn("volume buy", {
      token,
      amountBnb,
      minOutBuy: minOutBuy.toString(),
    });

    if (!simulationOnly) {
      const txB = await router.swapExactETHForTokens(
        minOutBuy,
        buyPath,
        wallet.address,
        deadline,
        { value }
      );
      logInfo("buy submitted", { hash: txB.hash });
      await txB.wait();
    }

    // === SELL ===
    const balance: bigint = await erc20.balanceOf(wallet.address);
    if (balance === 0n) {
      logWarn("no token balance after buy, skipping sell");
      return;
    }

    const allowance: bigint = await erc20.allowance(
      wallet.address,
      ROUTER_ADDRESS
    );
    if (allowance < balance && !simulationOnly) {
      const approveTx = await erc20.approve(ROUTER_ADDRESS, balance);
      logInfo("approve submitted", { hash: approveTx.hash });
      await approveTx.wait();
    }

    const sellPath = [token, WBNB_ADDRESS];
    const outSell: bigint[] = await router.getAmountsOut(balance, sellPath);
    if (outSell.length < 2)
      throw new Error("Router returned invalid sell path");

    const expectedSell = outSell[1];
    const minOutSell =
      expectedSell - (expectedSell * BigInt(slippageBips)) / 10_000n;
    logWarn("volume sell", {
      token,
      balance: balance.toString(),
      minOutSell: minOutSell.toString(),
    });

    if (!this.simulationOnly) {
      const txS =
        await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
          balance,
          minOutSell,
          [token, WBNB_ADDRESS],
          this.wallet.address,
          deadline
        );
      logInfo("sell submitted", { hash: txS.hash });
      await txS.wait();
    }
  }
}

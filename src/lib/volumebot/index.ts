import fs from "fs";
import path from "path";
import { Contract, parseEther } from "ethers";
import { TContext } from "../../utils/types";
import { ERC20_ABI, ROUTER_ABI } from "../../utils/abi";
import {
  BUSD_ADDRESS,
  ROUTER_ADDRESS,
  WBNB_ADDRESS,
} from "../../utils/address";
import { BaseContract } from "../base";

export class VolumeBot extends BaseContract {
  private readonly ctx: TContext;
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;

  constructor(ctx: TContext) {
    super(ctx.wallet, ctx.provider, ctx.simulationOnly);
  }

  run = async () => {
    const resolved = path.resolve(process.cwd(), "config.volume.json");
    const cfg = JSON!.parse(fs.readFileSync(resolved, "utf-8"));

    const intervalMs = cfg.intervalMs ?? 15_000;
    const token = cfg.token;
    const amountBnb = cfg.amountBnb ?? "0.01";
    const slippageBips = cfg.slippageBips ?? 800;

    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
      throw new Error("Invalid token address");
    }

    if (this.timer) clearInterval(this.timer);

    try {
      await this.oneCycle(token, amountBnb, slippageBips);
    } catch (err) {
      console.error("volume cycle error (immediate)", err);
    }

    this.timer = setInterval(async () => {
      if (this.inFlight) return;
      this.inFlight = true;
      try {
        await this.oneCycle(token, amountBnb, slippageBips);
      } catch (err) {
        console.error("volume cycle error", err);
      } finally {
        this.inFlight = false;
      }
    }, intervalMs);
  };

  private async oneCycle(
    token: string,
    amountBnb: string,
    slippageBips: number
  ) {
    const { wallet } = this.ctx;
    const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const deadline = Math.floor(Date.now() / 1000) + 180;

    // Buy
    const value = parseEther(amountBnb);
    const outBuy: bigint[] = await router.getAmountsOut(value, [
      WBNB_ADDRESS,
      token,
    ]);
    const minOutBuy =
      outBuy[1] - (outBuy[1] * BigInt(slippageBips)) / BigInt(10_000);
    console.debug({ token, amountBnb }, "volume buy");
    if (!this.ctx.simulationOnly) {
      const txB = await router.swapExactETHForTokens(
        minOutBuy,
        [WBNB_ADDRESS, token],
        wallet.address,
        deadline,
        { value }
      );
      await txB.wait();
    }

    // Sell function
    const erc20 = new Contract(token, ERC20_ABI, wallet);
    const balance: bigint = await erc20.balanceOf(wallet.address);
    const allowance: bigint = await erc20.allowance(
      wallet.address,
      ROUTER_ADDRESS
    );
    if (allowance < balance && !this.ctx.simulationOnly) {
      const approveTx = await erc20.approve(ROUTER_ADDRESS, balance);
      await approveTx.wait();
    }
    const amountOut: bigint[] = await router.getAmountsOut(balance, [
      token,
      WBNB_ADDRESS,
    ]);
    const minAmountOut =
      amountOut[1] - (amountOut[1] * BigInt(slippageBips)) / BigInt(10_000);
    console.debug({ token, balance: balance.toString() }, "volume sell");
    if (!this.ctx.simulationOnly) {
      const txS =
        await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
          balance,
          minAmountOut,
          [token, WBNB_ADDRESS],
          wallet.address,
          deadline
        );
      await txS.wait();
    }
  }
}

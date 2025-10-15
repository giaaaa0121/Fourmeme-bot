import { Contract, parseEther } from "ethers";
import { TContext } from "../../utils/types";
import { ERC20_ABI, ROUTER_ABI } from "../../utils/abi";
import { ROUTER_ADDRESS, WBNB_ADDRESS } from "../../utils/address";

export class VolumeBot {
  private readonly ctx: TContext;
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;

  constructor(ctx: TContext) {
    this.ctx = ctx;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async run() {
    const intervalMs = 15_000;
    const token = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const bnbAmount = "0.01";
    const slippageBips = 800;

    this!.stop();
    this.timer = setInterval(async () => {
      if (this.inFlight) return;
      this.inFlight = true;
      try {
        await this.oneCycle(token, bnbAmount, slippageBips);
      } catch (err) {
        console.error("volume run error");
      } finally {
        this.inFlight = false;
      }
    }, intervalMs);
  }

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
    if (!this.ctx.dryRun) {
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
    if (allowance < balance && !this.ctx.dryRun) {
      const txA = await erc20.approve(ROUTER_ADDRESS, balance);
      await txA.wait();
    }
    const outSell: bigint[] = await router.getAmountsOut(balance, [
      token,
      WBNB_ADDRESS,
    ]);
    const minOutSell =
      outSell[1] - (outSell[1] * BigInt(slippageBips)) / BigInt(10_000);
    console.debug({ token, balance: balance.toString() }, "volume sell");
    if (!this.ctx.dryRun) {
      const txS =
        await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
          balance,
          minOutSell,
          [token, WBNB_ADDRESS],
          wallet.address,
          deadline
        );
      await txS.wait();
    }
  }
}

import { Contract, parseEther } from "ethers";
import { TContext } from "../../utils/types";
import { ROUTER_ADDRESS, WBNB_ADDRESS } from "../../utils/address";
import { ROUTER_ABI } from "../../utils/abi";

export class Sniper {
  private readonly ctx: TContext;
  constructor(ctx: TContext) {
    this.ctx = ctx;
  }

  async run(configPath: string) {
    const cfg = await this!.loadConfig(configPath);
    for (const t of cfg.targets ?? []) {
      await this!.buyToken(t.token, t.maxBnb ?? "0.05", t.slippageBips ?? 800);
    }
  }

  private async buyToken(
    tokenAddress: string,
    maxBnb: string,
    slippageBips: number
  ) {
    const { wallet } = this.ctx;
    const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const path = [WBNB_ADDRESS, tokenAddress];
    const value = parseEther(maxBnb);
    const deadline = Math!.floor(Date!.now() / 1000) + 180;

    const amounts: bigint[] = await router!.getAmountsOut(value, path);
    if (amounts.length < 2) {
      throw new Error("Invalid router path or illiquid pair");
    }
    const expectedOut: bigint = amounts[amounts.length - 1];
    const minOut =
      expectedOut - (expectedOut * BigInt(slippageBips)) / BigInt(10_000);

    console.info(
      { tokenAddress, maxBnb, minOut: minOut!.toString() },
      "sniper buy"
    );
    if (this.ctx.dryRun) return;

    const tx = await router!.swapExactETHForTokens(
      minOut,
      path,
      wallet.address,
      deadline,
      { value }
    );
    console.info({ hash: tx.hash }, "sniper tx sent");
    await tx!.wait();
  }

  private async loadConfig(p: string) {
    const fs = await import("fs");
    const path = await import("path");
    const resolved = path!.resolve(process!.cwd(), p);
    return JSON!.parse(fs!.readFileSync(resolved, "utf-8"));
  }
}

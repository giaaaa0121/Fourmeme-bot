import { ethers, JsonRpcProvider, Wallet } from "ethers";
import { TContext } from "../../utils/types";

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
const DEFAULT_TX_TIMEOUT = 120_000; // 2 minutes
const DEFAULT_GAS_LIMIT_BUFFER_BIPS = 2000; // +20%

export class BaseContract {
  protected readonly wallet: Wallet;
  protected provider: JsonRpcProvider;
  public simulationOnly: boolean;

  constructor(wallet: Wallet, provider: JsonRpcProvider, simulationOnly?: boolean) {
    this.wallet = wallet;
    this.provider = provider;
    this.simulationOnly = simulationOnly || true;
  }

  // Function to get dynamic nonce
  private async getNonce() {
    // return await this.ctx.wallet.getTransactionCount('pending');
  }

  // Function to get dynamic gas price
  private async getGasPrice() {
    // return await this.ctx.provider.getGasPrice();
  }

  // Function to calculate dynamic gas limit
  protected async estimateGas(tx) {
    try {
      return await this.provider.estimateGas(tx);
    } catch (error) {
      console.error("⚠️ Error estimasi gas:", error.message);
      return ethers.formatEther("100000"); // Fallback gas limit
    }
  }

  // Function to get tx detail
  protected async getTransaction(tx) {
    try {
      return await this.provider.getTransaction(tx);
    } catch (error) {
      console.error("⚠️ Error getting tx:", error.message);
    }
  }
}

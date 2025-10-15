import { JsonRpcProvider, Wallet } from 'ethers'

export type TCtx = {
  wallet: Wallet;
  provider: JsonRpcProvider;
  dryRun: boolean;
};

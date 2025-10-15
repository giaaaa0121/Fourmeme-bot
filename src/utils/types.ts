import { JsonRpcProvider, Wallet } from 'ethers'

export type TContext = {
  wallet: Wallet;
  provider: JsonRpcProvider;
  dryRun: boolean;
};

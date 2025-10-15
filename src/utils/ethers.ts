import { JsonRpcProvider, Wallet } from "ethers";
import chalk from "chalk";

export const getWalletAndProvider = ({
  rpcUrl,
  chaindId,
  privateKey,
}: {
  rpcUrl: string;
  chaindId: string;
  privateKey: string;
}) => {
  if (!rpcUrl) throw new Error("RPC_URL is required");
  if (!chaindId) throw new Error("CHAIN_ID is required");
  if (!privateKey) throw new Error("PRIVATE_KEY is required");

  const provider = new JsonRpcProvider(rpcUrl, chaindId, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  return { provider, wallet };
};

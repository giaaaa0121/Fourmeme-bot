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
  if (!rpcUrl) console.error(chalk.red("RPC_URL is required"));
  if (!chaindId) console.error(chalk.red("CHAIN_ID is required"));
  if (!privateKey) console.error(chalk.red("PRIVATE_KEY is required"));
  
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    console.log("wallet", wallet.address);
    return { provider, wallet };
  } catch (e) {
    console.error(chalk.red(e.message));
  }
};

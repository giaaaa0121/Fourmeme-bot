import { JsonRpcProvider, Wallet } from 'ethers'

export function getWalletAndProvider({
  rpcUrl,
  chaindId,
  priKey,
}: {
  rpcUrl: string;
  chaindId: string;
  priKey: string;
}) {
  const provider = new JsonRpcProvider(rpcUrl, chaindId, {
    staticNetwork: true,
  });
  const wallet = new Wallet(priKey, provider);
  return { provider, wallet };
}

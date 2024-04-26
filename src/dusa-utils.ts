import {
  ChainId,
  LB_ROUTER_ADDRESS,
  PairV2,
  WMAS as _WMAS,
  USDC as _USDC,
  ILBPair,
} from '@dusalabs/sdk';
import { Client, IAccount } from '@massalabs/massa-web3';
import { config } from 'dotenv';
config();

const CHAIN_ID = ChainId.MAINNET;

export const PAIR_TO_BIN_STEP = {
  'WMAS-USDC': 20,
  'WETH-WMAS': 15,
  'DAI-USDC': 1,
};

export async function getBinsData(
  binStep: number,
  client: Client,
  account: IAccount,
  pair: PairV2,
) {
  const lbPair = await pair.fetchLBPair(binStep, client, CHAIN_ID);
  const lbPairData = await new ILBPair(
    lbPair.LBPair,
    client,
  ).getReservesAndId();
  const activeBinId = lbPairData.activeId;

  const pairAddress = lbPair.LBPair;

  const pairContract = new ILBPair(pairAddress, client);

  const userPositionIds = await pairContract.getUserBinIds(account.address!);

  return {
    activeBinId,
    pairContract,
    userPositionIds,
    binStep,
  };
}

export async function activeBinInPosition(
  activeBinId: number,
  userPositionIds: number[],
): Promise<boolean> {
  return userPositionIds.includes(activeBinId);
}

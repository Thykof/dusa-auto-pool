import { Client } from '@massalabs/massa-web3';
import {
  Bin,
  ChainId,
  ILBPair,
  PairV2,
  TokenAmount,
  USDC as _USDC,
  WETH as _WETH,
  WMAS as _WMAS,
} from '@dusalabs/sdk';
import { IAccount } from '@massalabs/massa-web3';
import { getBalance } from './balance';
import BigNumber from 'bignumber.js';
import { swap } from './swap';
import { getClient } from './utils';
import { PAIR_TO_BIN_STEP } from './dusa-utils';
import { config } from 'dotenv';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];

const maxTokenA = process.env.TOKEN_A_MAX
  ? BigInt(process.env.TOKEN_A_MAX)
  : Infinity;
const maxTokenB = process.env.TOKEN_B_MAX
  ? BigInt(process.env.TOKEN_B_MAX)
  : Infinity;

export async function getAmountsToAdd(
  client: Client,
  account: IAccount,
  pair: PairV2,
) {
  const tokenA = pair.tokenA;
  const tokenB = pair.tokenB;

  const newBalanceTokenA = await getBalance(
    tokenA.address,
    client,
    account.address!,
  );
  const newBalanceTokenB = await getBalance(
    tokenB.address,
    client,
    account.address!,
  );

  let amountA = newBalanceTokenA - (newBalanceTokenA / 100n) * 1n;
  if (typeof maxTokenA === 'bigint' && maxTokenA < amountA) {
    amountA = maxTokenA;
  }
  let amountB = newBalanceTokenB - (newBalanceTokenB / 100n) * 1n;
  if (typeof maxTokenB === 'bigint' && maxTokenB < amountB) {
    amountB = maxTokenB;
  }

  return {
    amountA: new TokenAmount(tokenA, amountA),
    amountB: new TokenAmount(tokenB, amountB),
  };
}

export async function equilibrateBalances(
  client: Client,
  account: IAccount,
  pair: PairV2,
  currentPrice: BigNumber,
) {
  const tokenA = pair.tokenA;
  const tokenB = pair.tokenB;

  const balanceTokenA = await getBalance(
    tokenA.address,
    client,
    account.address!,
  );
  const balanceTokenB = await getBalance(
    tokenB.address,
    client,
    account.address!,
  );

  const balanceAWorthInB = BigInt(
    new BigNumber(balanceTokenA.toString())
      .multipliedBy(currentPrice)
      .toFixed(0),
  );
  const totalValue = balanceTokenB + balanceAWorthInB;
  const halfValue = totalValue / 2n;

  const higherBalanceToken = balanceAWorthInB > balanceTokenB ? tokenA : tokenB;
  const higherBalanceAmount =
    higherBalanceToken === tokenA ? balanceAWorthInB : balanceTokenB;
  const amountToSwap = new TokenAmount(
    higherBalanceToken,
    higherBalanceAmount - halfValue,
  );
  const lowerBalanceToken = higherBalanceToken === tokenA ? tokenB : tokenA;
  const inputToken = higherBalanceToken;
  const outputToken = lowerBalanceToken;

  await swap(client, account, inputToken, outputToken, amountToSwap);
}

export async function getCurrentPrice(
  client: Client,
  pair: PairV2,
  binStep: number,
) {
  const lbPair = await pair.fetchLBPair(binStep, client, CHAIN_ID);

  const lbPairData = await new ILBPair(
    lbPair.LBPair,
    client,
  ).getReservesAndId();

  return new BigNumber(Bin.getPriceFromId(lbPairData.activeId, binStep));
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);

  // const pair = new PairV2(WMAS, USDC);
  // const binStep = PAIR_TO_BIN_STEP['WMAS-USDC'];

  const pair = new PairV2(WETH, WMAS);
  const binStep = PAIR_TO_BIN_STEP['WETH-WMAS'];

  const currentPrice = await getCurrentPrice(client, pair, binStep);
  console.log(currentPrice);

  equilibrateBalances(client, account, pair, currentPrice);
}

// await main();

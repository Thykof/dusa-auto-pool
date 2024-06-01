import {
  ChainId,
  CollectFeesEvent,
  CompositionFeeEvent,
  ILBPair,
  WMAS as _WMAS,
  WETH as _WETH,
  USDC as _USDC,
  PairV2,
  TokenAmount,
  Token,
  LiquidityEvent,
} from '@dusalabs/sdk';
import fs from 'fs';
import { getClient } from './utils';
import { getBinsData, PAIR_TO_BIN_STEP } from './dusa-utils';
import { Client, IAccount } from '@massalabs/massa-web3';
import { findBestTrade } from './swap';
import * as path from 'path';
import { config } from 'dotenv';
config();

const CHAIN_ID = ChainId.MAINNET;
const WMAS = _WMAS[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];

const logFile =
  new Date().getTime() + (process.env.PAIR || '') + '_p-and-l.log';
const logFileProfitAndLoss = `${new Date().getTime()}${
  process.env.PAIR
}_p-and-l-acc.log`;
const logFileIL = `${new Date().getTime()}${process.env.PAIR}_il.log`;
const logFileILAcc = `${new Date().getTime()}${process.env.PAIR}_il_acc.log`;
const logFileTotal = `${new Date().getTime()}${process.env.PAIR}_total.log`;
const logFileTotalAcc = `${new Date().getTime()}${
  process.env.PAIR
}_total_acc.log`;

function pushInFile(fileName: string, value: string, label?: string) {
  console.log(`${label || ''} ${value}`);
  fs.appendFileSync(path.join('src', fileName), value + '\n');
}

let profitAndLoss = 0n;
let totalIL = 0n;
let totalGlobal = 0n;

export async function profitability(
  client: Client,
  pair: PairV2,
  withdrawEvents: LiquidityEvent[],
  depositedEvents: LiquidityEvent[],
  compositionFees?: CompositionFeeEvent,
  collectedFees?: CollectFeesEvent,
) {
  // #1 composition fees and collected fees
  const token0isX = pair.token0.sortsBefore(pair.token1);
  // we want to trade X to Y
  const inputToken = token0isX ? pair.token0 : pair.token1;
  const outputToken = token0isX ? pair.token1 : pair.token0;
  const tokenX = token0isX ? pair.token0 : pair.token1; // WETH
  const tokenY = token0isX ? pair.token1 : pair.token0; // WMAS
  const { rewardsX, rewardsY } = totalRewards(
    tokenX,
    tokenY,
    collectedFees,
    compositionFees,
  );
  console.log(
    'rewards X',
    `${new TokenAmount(tokenX, rewardsX).toSignificant(tokenX.decimals)} ${
      tokenX.symbol
    }`,
  );
  console.log(
    'rewards Y',
    `${new TokenAmount(tokenY, rewardsY).toSignificant(tokenY.decimals)} ${
      tokenY.symbol
    }`,
  );
  let removedAmountIn = new TokenAmount(tokenX, rewardsX);

  let feesGains = rewardsY;
  let neg = false;
  if (removedAmountIn.raw !== 0n) {
    neg = removedAmountIn.raw < 0n;
    if (neg) {
      console.log('amountIn is negative');
      removedAmountIn = new TokenAmount(tokenX, removedAmountIn.raw * -1n);
    }
    const { bestTrade } = await findBestTrade(
      client,
      inputToken,
      outputToken,
      removedAmountIn,
      true,
    );
    feesGains += neg
      ? bestTrade.outputAmount.raw * -1n
      : bestTrade.outputAmount.raw;
  }
  const feesGainsAmount = new TokenAmount(tokenY, feesGains);
  profitAndLoss += feesGains;
  pushInFile(
    logFile,
    `${feesGainsAmount.toSignificant(tokenY.decimals)} ${tokenY.symbol}`,
    'feesGainsAmount',
  );
  pushInFile(
    logFileProfitAndLoss,
    `${new TokenAmount(tokenY, profitAndLoss).toSignificant(tokenY.decimals)} ${
      tokenY.symbol
    }`,
    'profitAndLoss',
  );

  // #2 impermanent loss
  let impermanentLoss = 0n;
  if (depositedEvents) {
    // get the removed liquidity and convert into Y
    const withdrawAmountX = withdrawEvents.reduce(
      (acc, curr) => acc + curr.amountX,
      0n,
    );
    const withdrawAmountY = withdrawEvents.reduce(
      (acc, curr) => acc + curr.amountY,
      0n,
    );
    console.log(
      'withdrawAmountX',
      `${new TokenAmount(tokenX, withdrawAmountX).toSignificant(
        tokenX.decimals,
      )} ${tokenX.symbol}`,
    );
    console.log(
      'withdrawAmountY',
      `${new TokenAmount(tokenY, withdrawAmountY).toSignificant(
        tokenY.decimals,
      )} ${tokenY.symbol}`,
    );

    let removedAmountY = 0n;
    if (withdrawAmountX > 0n) {
      const { bestTrade } = await findBestTrade(
        client,
        inputToken,
        outputToken,
        new TokenAmount(tokenX, withdrawAmountX),
        true,
      );
      removedAmountY = bestTrade.outputAmount.raw;
    }
    const totalRemoved = removedAmountY + withdrawAmountY;
    console.log(
      'totalRemoved',
      `${new TokenAmount(tokenY, totalRemoved).toSignificant(
        tokenY.decimals,
      )} ${tokenY.symbol}`,
    );

    // get the added liquidity and convert into Y
    if (depositedEvents.length === 0) {
      console.log('no data of added liquidity');
      return;
    }
    const addedAmountX = depositedEvents.reduce(
      (acc, curr) => acc + curr.amountX,
      0n,
    );
    const addedAmountY = depositedEvents.reduce(
      (acc, curr) => acc + curr.amountY,
      0n,
    );
    console.log(
      'addedAmountX',
      `${new TokenAmount(tokenX, addedAmountX).toSignificant(
        tokenX.decimals,
      )} ${tokenX.symbol}`,
    );
    console.log(
      'addedAmountY',
      `${new TokenAmount(tokenY, addedAmountY).toSignificant(
        tokenY.decimals,
      )} ${tokenY.symbol}`,
    );

    let addedY = 0n;
    if (addedAmountX > 0n) {
      const { bestTrade } = await findBestTrade(
        client,
        inputToken,
        outputToken,
        new TokenAmount(tokenX, addedAmountX),
        true,
      );
      addedY = bestTrade.outputAmount.raw;
    }
    const totalAdded = addedY + addedAmountY;
    console.log(
      'totalAdded',
      `${new TokenAmount(tokenY, totalAdded).toSignificant(tokenY.decimals)} ${
        tokenY.symbol
      }`,
    );

    // log impermanent loss
    impermanentLoss = totalAdded - totalRemoved;
    totalIL += impermanentLoss;
    pushInFile(
      logFileIL,
      `${new TokenAmount(tokenY, impermanentLoss).toSignificant(
        tokenY.decimals,
      )} ${tokenY.symbol}`,
      'impermanentLoss',
    );
    pushInFile(
      logFileILAcc,
      `${new TokenAmount(tokenY, totalIL).toSignificant(tokenY.decimals)} ${
        tokenY.symbol
      }`,
      'totalIL',
    );
  }

  // #3 total
  const total = feesGains - impermanentLoss;
  pushInFile(
    logFileTotal,
    `${new TokenAmount(tokenY, total).toSignificant(tokenY.decimals)} ${
      tokenY.symbol
    }`,
    'total',
  );

  totalGlobal += total;
  pushInFile(
    logFileTotalAcc,
    `${new TokenAmount(tokenY, totalGlobal).toSignificant(tokenY.decimals)} ${
      tokenY.symbol
    }`,
    'totalGlobal',
  );
}

function totalRewards(
  tokenX: Token,
  tokenY: Token,
  collectedFees?: CollectFeesEvent,
  compositionFees?: CompositionFeeEvent,
) {
  if (compositionFees) {
    console.log(
      'composition fees X',
      `${new TokenAmount(tokenX, compositionFees.activeFeeX).toSignificant(
        tokenX.decimals,
      )} ${tokenX.symbol}`,
    );
    console.log(
      'composition fees Y',
      `${new TokenAmount(tokenY, compositionFees.activeFeeY).toSignificant(
        tokenY.decimals,
      )} ${tokenY.symbol}`,
    );
  }

  if (collectedFees) {
    console.log(
      'collected fees X',
      `${new TokenAmount(tokenX, collectedFees.amountX).toSignificant(
        tokenX.decimals,
      )} ${tokenX.symbol}`,
    );
    console.log(
      'collected fees Y',
      `${new TokenAmount(tokenY, collectedFees.amountY).toSignificant(
        tokenY.decimals,
      )} ${tokenY.symbol}`,
    );
  }

  const rewardsX =
    (collectedFees?.amountX || 0n) - (compositionFees?.activeFeeX || 0n);
  const rewardsY =
    (collectedFees?.amountY || 0n) - (compositionFees?.activeFeeY || 0n);
  return { rewardsX, rewardsY };
}

// ---

async function getCurrentRatio(
  binStep: number,
  client: Client,
  account: IAccount,
  pair: PairV2,
) {
  const { pairContract } = await getBinsData(binStep, client, account, pair);

  const lbPair = await pair.fetchLBPair(binStep, client, CHAIN_ID);

  const lbPairData = await new ILBPair(
    lbPair.LBPair,
    client,
  ).getReservesAndId();

  const activeBin = lbPairData.activeId;

  const bins = await pairContract.getBins([activeBin]);

  const ratioXY = bins[0].reserveX / bins[0].reserveY;

  return ratioXY;
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);
  const pair = new PairV2(WETH, WMAS);
  const binStep = PAIR_TO_BIN_STEP['WETH-WMAS'];

  const ratioXY = await getCurrentRatio(binStep, client, account, pair);
  console.log(ratioXY);

  console.log(WETH.sortsBefore(WMAS));

  console.log('===test nothing to trade');
  await profitability(
    client,
    pair,
    [],
    [],
    {
      to: account.address!,
      id: 0,
      activeFeeX: 0n, // WETH
      activeFeeY: 1658950354n, // WMAS
    },
    {
      caller: account.address!, // idk
      to: account.address!,
      amountX: 0n,
      amountY: 2043598431n,
    },
  );
  console.log('===test no reward, loss');
  await profitability(
    client,
    pair,
    [],
    [],
    {
      to: account.address!,
      id: 0,
      activeFeeX: 210653417347550n, // WETH
      activeFeeY: 0n, // WMAS
    },
    {
      caller: account.address!, // idk
      to: account.address!,
      amountX: 6071260057724n,
      amountY: 1475693250n,
    },
  );
}

// await main();

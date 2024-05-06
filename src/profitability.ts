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
  LiquidityEvent,
} from '@dusalabs/sdk';
import fs from 'fs';
import { getClient } from './utils';
import { getBinsData, PAIR_TO_BIN_STEP } from './dusa-utils';
import { Client, IAccount } from '@massalabs/massa-web3';
import { findBestTrade } from './swap';

const CHAIN_ID = ChainId.MAINNET;
const WMAS = _WMAS[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];

const logFile = new Date().getTime() + '.log';
const logFileProfitAndLoss = `${new Date().getTime()}_p-and-l.log`;
const logFileIL = `${new Date().getTime()}_il.log`;
const logFileILAcc = `${new Date().getTime()}_il_acc.log`;
const logFileTotal = `${new Date().getTime()}_total.log`;
const logFileTotalAcc = `${new Date().getTime()}_total_acc.log`;

function pushInFile(fileName: string, value: string, label?: string) {
  console.log(`${label || ''} ${value}`);
  fs.appendFileSync(fileName, value + '\n');
}

let profitAndLoss = 0n;
let totalIL = 0n;

export async function profitability(
  client: Client,
  pair: PairV2,
  withdrawEvents: LiquidityEvent[],
  depositedEvents: LiquidityEvent[],
  compositionFees?: CompositionFeeEvent,
  collectedFees?: CollectFeesEvent,
) {
  // #1 composition fees and collected fees
  const { rewardsX, rewardsY } = totalRewards(compositionFees, collectedFees);
  console.log('rewards X', rewardsX);
  console.log('rewards Y', rewardsY);
  const token0isX = pair.token0.sortsBefore(pair.token1);
  // we want to trade X to Y
  const inputToken = token0isX ? pair.token0 : pair.token1;
  const outputToken = token0isX ? pair.token1 : pair.token0;
  const tokenX = token0isX ? pair.token0 : pair.token1; // WETH
  const tokenY = token0isX ? pair.token1 : pair.token0; // WMAS
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
    console.log('withdrawAmountX', withdrawAmountX);
    console.log('withdrawAmountY', withdrawAmountY);

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
    console.log('totalRemoved', totalRemoved);

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
    console.log('addedAmountX', addedAmountX);
    console.log('addedAmountY', addedAmountY);

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
    console.log('totalAdded', totalAdded);

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
}

function totalRewards(
  compositionFees?: CompositionFeeEvent,
  collectedFees?: CollectFeesEvent,
) {
  console.log('composition fees', compositionFees);
  console.log('collected fees', collectedFees);
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

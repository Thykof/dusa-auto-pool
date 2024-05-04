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

function pushInFile(fileName: string, value: string) {
  fs.appendFileSync(fileName, value + '\n');
}

let profitAndLoss = 0n;

export async function aggregateFees(
  client: Client,
  pair: PairV2,
  tokenAmount0?: TokenAmount,
  tokenAmount1?: TokenAmount,
  compositionFees?: CompositionFeeEvent,
  collectedFees?: CollectFeesEvent,
) {
  const { rewardsX, rewardsY } = totalRewards(compositionFees, collectedFees);
  console.log('rewards', rewardsX, rewardsY);
  const token0isX = pair.token0.sortsBefore(pair.token1);
  // console.log('token 0', pair.token0.symbol); // WETH
  // console.log('token 1', pair.token1.symbol); // WMAS
  // console.log('token0isX', token0isX); // true
  // we want to trade X to Y
  const inputToken = token0isX ? pair.token0 : pair.token1;
  const outputToken = token0isX ? pair.token1 : pair.token0;
  const tokenX = token0isX ? pair.token0 : pair.token1; // WETH
  const tokenY = token0isX ? pair.token1 : pair.token0; // WMAS
  let amountIn = new TokenAmount(tokenX, rewardsX);

  console.log(
    'amountIn',
    amountIn.toSignificant(tokenX.decimals),
    amountIn.raw,
  );
  let outputAmount;
  let neg = false;
  if (amountIn.raw !== 0n) {
    neg = amountIn.raw < 0n;
    if (neg) {
      console.log('amountIn is negative');
      amountIn = new TokenAmount(tokenX, amountIn.raw * -1n);
    }
    const { bestTrade } = await findBestTrade(
      client,
      inputToken,
      outputToken,
      amountIn,
      true,
    );
    outputAmount = new TokenAmount(tokenY, bestTrade.outputAmount.raw * -1n);
    console.log(
      `outputAmount ${bestTrade.outputAmount.toSignificant(tokenY.decimals)} ${
        tokenY.symbol
      }`,
    );
  } else {
    console.log('no rewards to trade');
    outputAmount = new TokenAmount(tokenY, rewardsY);
    console.log(
      `rewards ${outputAmount.toSignificant(tokenY.decimals)} ${tokenY.symbol}`,
    );
  }
  profitAndLoss += outputAmount.raw;
  pushInFile(logFile, outputAmount.toSignificant(tokenY.decimals));
  pushInFile(
    logFileProfitAndLoss,
    new TokenAmount(tokenY, profitAndLoss).toSignificant(tokenY.decimals),
  );
}

function totalRewards(
  compositionFees?: CompositionFeeEvent,
  collectedFees?: CollectFeesEvent,
) {
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
  await aggregateFees(
    client,
    pair,
    new TokenAmount(WETH, 0n),
    new TokenAmount(WMAS, 0n),
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
  await aggregateFees(
    client,
    pair,
    new TokenAmount(WETH, 0n),
    new TokenAmount(WMAS, 0n),
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

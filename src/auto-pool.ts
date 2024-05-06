import { addLiquidity } from './add-liquidity';
import { getClient } from './utils';
import { config } from 'dotenv';
import { Client, IAccount } from '@massalabs/massa-web3';
import {
  PairV2,
  WMAS as _WMAS,
  USDC as _USDC,
  WETH as _WETH,
  ChainId,
  LiquidityEvent,
} from '@dusalabs/sdk';
import { removeLiquidity } from './remove-liquidity';
import {
  activeBinInPosition,
  getBinsData,
  PAIR_TO_BIN_STEP,
} from './dusa-utils';
import { thankYouThykofMAS } from './transfer';
import { getAmountsToAdd } from './equilibrateBalances';
import { profitability } from './profitability';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];

let oldDepositedEvents: LiquidityEvent[] = [];

async function autoLiquidity(
  binStep: number,
  client: Client,
  account: IAccount,
  pair: PairV2,
) {
  const { activeBinId, pairContract, userPositionIds } = await getBinsData(
    binStep,
    client,
    account,
    pair,
  );
  const totalSupplies = await pairContract.getSupplies(userPositionIds);
  const totalUserSupplies = totalSupplies.reduce((acc, curr) => acc + curr, 0n);

  if (totalUserSupplies === 0n) {
    console.log("no liquidity, let's add some");
    const { amount0, amount1 } = await getAmountsToAdd(
      client,
      account,
      pair.token0,
      pair.token1,
    );
    const { depositEvents } = await addLiquidity(
      binStep,
      client,
      account,
      amount0,
      amount1,
      pair,
    );
    oldDepositedEvents = depositEvents;
    await thankYouThykofMAS(client, 10_000_000n);
    return;
  }

  const providingActiveBin = await activeBinInPosition(
    activeBinId,
    userPositionIds,
  );
  if (!providingActiveBin) {
    const { feesCollectedEvent, withdrawEvents } = await removeLiquidity(
      binStep,
      client,
      account,
      pair,
      activeBinId,
      pairContract,
      userPositionIds,
    );

    const { amount0, amount1 } = await getAmountsToAdd(
      client,
      account,
      pair.token0,
      pair.token1,
    );

    const { compositionFeeEvent, depositEvents } = await addLiquidity(
      binStep,
      client,
      account,
      amount0,
      amount1,
      pair,
    );

    try {
      await profitability(
        client,
        pair,
        withdrawEvents,
        oldDepositedEvents,
        compositionFeeEvent,
        feesCollectedEvent,
      );
    } catch (error) {
      console.error('Error aggregating fees', error);
    }

    oldDepositedEvents = depositEvents;
  } else {
    console.log('Active bin already in position');
  }
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);

  const interval = 1000 * 60 * 5;

  // For now it won't work with multiple pairs that have token in common
  // setInterval(async () => {
  //   const pair = new PairV2(USDC, WMAS);
  //   const binStep = PAIR_TO_BIN_STEP['WMAS-USDC'];
  //   await autoLiquidity(binStep, client, account, pair);
  // }, interval);

  const pair = new PairV2(WETH, WMAS);
  const binStep = PAIR_TO_BIN_STEP['WETH-WMAS'];
  await autoLiquidity(binStep, client, account, pair);
  setInterval(async () => {
    await autoLiquidity(binStep, client, account, pair);
  }, interval);
}

await main();

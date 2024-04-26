import { addLiquidity } from './add-liquidity';
import { getClient } from './utils';
import { config } from 'dotenv';
import { Client, IAccount } from '@massalabs/massa-web3';
import {
  PairV2,
  TokenAmount,
  WMAS as _WMAS,
  USDC as _USDC,
  WETH as _WETH,
  ChainId,
} from '@dusalabs/sdk';
import { removeLiquidity } from './remove-liquidity';
import {
  activeBinInPosition,
  getBinsData,
  PAIR_TO_BIN_STEP,
} from './dusa-utils';
import { thankYouThykofMAS } from './transfer';
import { equilibrateBalances } from './swap';
import { getBalance } from './balance';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];

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
    const balanceToken0 = await getBalance(
      pair.token0.address,
      client,
      account.address!,
    );
    const balanceToken1 = await getBalance(
      pair.token1.address,
      client,
      account.address!,
    );
    await addLiquidity(
      binStep,
      client,
      account,
      new TokenAmount(pair.token0, balanceToken0 - (balanceToken0 / 100n) * 5n),
      new TokenAmount(pair.token1, balanceToken1 - (balanceToken1 / 100n) * 5n),
      pair,
    );
    await thankYouThykofMAS(client, 10_000_000n);
    return;
  }

  const providingActiveBin = await activeBinInPosition(
    activeBinId,
    userPositionIds,
  );
  if (!providingActiveBin) {
    await removeLiquidity(
      binStep,
      client,
      account,
      pair,
      activeBinId,
      pairContract,
      userPositionIds,
    );

    // equilibrate the balances with a swap before adding liquidity
    const { newTokenAmount0, newTokenAmount1 } = await equilibrateBalances(
      client,
      account,
      pair.token0,
      pair.token1,
    );

    await addLiquidity(
      binStep,
      client,
      account,
      newTokenAmount0,
      newTokenAmount1,
      pair,
    );
  } else {
    console.log('Active bin already in position');
  }
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);

  const interval = 1000 * 60 * 10;

  setInterval(async () => {
    const pair = new PairV2(USDC, WMAS);
    const binStep = PAIR_TO_BIN_STEP['WMAS-USDC'];
    await autoLiquidity(binStep, client, account, pair);
  }, interval);

  setInterval(async () => {
    const pair = new PairV2(WETH, WMAS);
    const binStep = PAIR_TO_BIN_STEP['WETH-WMAS'];
    await autoLiquidity(binStep, client, account, pair);
  }, interval);
}

await main();

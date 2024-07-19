import {
  ChainId,
  IRouter,
  LB_ROUTER_ADDRESS,
  PairV2,
  WMAS as _WMAS,
  USDC as _USDC,
  WETH as _WETH,
  Percent,
  ILBPair,
  EventDecoder,
  CollectFeesEvent,
  LiquidityEvent,
} from '@dusalabs/sdk';
import { Client, EOperationStatus, IAccount } from '@massalabs/massa-web3';
import { getClient, waitOp } from './utils';
import { getBinsData, PAIR_TO_BIN_STEP } from './dusa-utils';
import { config } from 'dotenv';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];

const router = LB_ROUTER_ADDRESS[CHAIN_ID];

export async function removeLiquidity(
  binStep: number,
  client: Client,
  account: IAccount,
  pair: PairV2,
  activeBinId: number,
  pairContract: ILBPair,
  userPositionIds: number[],
) {
  const address = account.address!;

  // set amount slippage tolerance
  const allowedAmountSlippage =
    parseInt(process.env.ALLOWED_AMOUNT_SLIPPAGE || '50') || 50; // in bips

  // set deadline for the transaction
  const currentTimeInMs = new Date().getTime();
  const deadline = currentTimeInMs + 3_600_000;

  const addressArray = Array.from(
    { length: userPositionIds.length },
    () => address,
  );
  const bins = await pairContract.getBins(userPositionIds);

  const allBins = await pairContract.balanceOfBatch(
    addressArray,
    userPositionIds,
  );
  const nonZeroAmounts = allBins.filter((amount) => amount !== 0n);
  const totalSupplies = await pairContract.getSupplies(userPositionIds);

  const removeLiquidityInput = pair.calculateAmountsToRemove(
    userPositionIds,
    activeBinId,
    bins,
    totalSupplies,
    nonZeroAmounts.map(String),
    new Percent(BigInt(allowedAmountSlippage)),
  );

  const tokens = await pairContract.getTokens();

  const params = pair.liquidityCallParameters({
    ...removeLiquidityInput,
    amount0Min: removeLiquidityInput.amountXMin,
    amount1Min: removeLiquidityInput.amountYMin,
    ids: userPositionIds,
    amounts: nonZeroAmounts,
    token0: tokens[0],
    token1: tokens[1],
    binStep,
    to: address,
    deadline,
  });

  // remove liquidity
  const txId = await new IRouter(router, client).remove(params);
  console.log('-------txId remove liquidity', txId);
  const { status, events } = await waitOp(client, txId, false);
  console.log('status: ', status);
  let feesCollectedEvent: CollectFeesEvent | undefined;
  const withdrawEvents: LiquidityEvent[] = [];
  events.map((l) => {
    const data = l.data;
    if (data.startsWith('WITHDRAWN_FROM_BIN:')) {
      const withdrawEvent = EventDecoder.decodeLiquidity(data);
      withdrawEvents.push(withdrawEvent);
    } else if (data.startsWith('FEES_COLLECTED:')) {
      feesCollectedEvent = EventDecoder.decodeCollectFees(data);
    } else if (status === EOperationStatus.SPECULATIVE_ERROR) {
      console.error('Error removing liquidity: ', l);
    }
  });

  return { feesCollectedEvent, withdrawEvents };
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);

  const pair = new PairV2(USDC, WMAS);
  const binStep = PAIR_TO_BIN_STEP['WMAS-USDC'];
  // const pair = new PairV2(WETH, WMAS);
  // const binStep = PAIR_TO_BIN_STEP['WETH-WMAS'];

  const { activeBinId, pairContract, userPositionIds } = await getBinsData(
    binStep,
    client,
    account,
    pair,
  );

  const { feesCollectedEvent, withdrawEvents } = await removeLiquidity(
    binStep,
    client,
    account,
    pair,
    activeBinId,
    pairContract,
    userPositionIds,
  );

  console.log('feesCollectedEvent: ', feesCollectedEvent);
  console.log('withdrawEvents: ', withdrawEvents);
}

await main();

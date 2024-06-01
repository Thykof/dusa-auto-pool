import {
  ChainId,
  IRouter,
  LB_ROUTER_ADDRESS,
  LiquidityDistribution,
  PairV2,
  TokenAmount,
  WMAS as _WMAS,
  USDC as _USDC,
  parseUnits,
  Percent,
  ILBPair,
  EventDecoder,
  LiquidityDistributionParams,
  CompositionFeeEvent,
  LiquidityEvent,
} from '@dusalabs/sdk';
import { Client, IAccount } from '@massalabs/massa-web3';
// import { getClient } from './client';
import { getClient, waitOp } from './utils';
import { PAIR_TO_BIN_STEP } from './dusa-utils';
import { increaseAllowanceIfNeeded } from './allowance';
import { config } from 'dotenv';
import { getAmountsToAdd } from './equilibrateBalances';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];

const router = LB_ROUTER_ADDRESS[CHAIN_ID];

export async function addLiquidity(
  binStep: number,
  client: Client,
  account: IAccount,
  tokenAmount0: TokenAmount,
  tokenAmount1: TokenAmount,
  pair: PairV2,
) {
  // set amount slippage tolerance
  const allowedAmountSlippage =
    parseInt(process.env.ALLOWED_AMOUNT_SLIPPAGE || '50') || 50; // in bips

  // set price slippage tolerance
  const allowedPriceSlippage =
    parseInt(process.env.ALLOWED_PRICE_SLIPPAGE || '50') || 50; // in bips

  // set deadline for the transaction
  const currentTimeInMs = new Date().getTime();
  const deadline = currentTimeInMs + 3_600_000;

  const lbPair = await pair.fetchLBPair(binStep, client, CHAIN_ID);
  const lbPairData = await new ILBPair(
    lbPair.LBPair,
    client,
  ).getReservesAndId();

  const addLiquidityInput = pair.addLiquidityParameters(
    binStep,
    tokenAmount0,
    tokenAmount1,
    new Percent(BigInt(allowedAmountSlippage)),
    new Percent(BigInt(allowedPriceSlippage)),
    LiquidityDistribution.SPOT,
  );

  const customDistribution: LiquidityDistributionParams = {
    deltaIds: [0],
    distributionX: [10n ** 18n],
    distributionY: [10n ** 18n],
  };

  const params = pair.liquidityCallParameters({
    ...addLiquidityInput,
    ...customDistribution,
    activeIdDesired: lbPairData.activeId,
    to: account.address!,
    deadline,
  });

  // increase allowance
  await increaseAllowanceIfNeeded(
    client,
    account,
    pair.token0,
    tokenAmount0.raw,
  );
  await increaseAllowanceIfNeeded(
    client,
    account,
    pair.token1,
    tokenAmount1.raw,
  );

  // add liquidity
  console.log(`===== Adding liquidity ${tokenAmount0.raw} ${tokenAmount1.raw}`);
  const opId = await new IRouter(router, client).add(params);
  console.log('OpId add liquidity', opId);
  const { status, events } = await waitOp(client, opId, false);
  console.log('status: ', status);
  let compositionFeeEvent: CompositionFeeEvent | undefined;
  const depositEvents: LiquidityEvent[] = [];
  events.map((l) => {
    const data = l.data;
    if (data.startsWith('COMPOSITION_FEE:')) {
      compositionFeeEvent = EventDecoder.decodeCompositionFee(data);
    } else if (data.startsWith('DEPOSITED_TO_BIN:')) {
      const depositEvent = EventDecoder.decodeLiquidity(data);
      depositEvents.push(depositEvent);
    }
  });

  return { compositionFeeEvent, depositEvents };
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);

  const pair = new PairV2(USDC, WMAS);
  const binStep = PAIR_TO_BIN_STEP['USDC-WMAS'];

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
  depositEvents.map(console.log);
}

// await main();

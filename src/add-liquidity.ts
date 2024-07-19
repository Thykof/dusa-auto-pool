import {
  ChainId,
  IRouter,
  LB_ROUTER_ADDRESS,
  LiquidityDistribution,
  PairV2,
  TokenAmount,
  WMAS as _WMAS,
  WETH as _WETH,
  USDC as _USDC,
  Percent,
  ILBPair,
  EventDecoder,
  LiquidityDistributionParams,
  CompositionFeeEvent,
  LiquidityEvent,
} from '@dusalabs/sdk';
import { Client, EOperationStatus, IAccount } from '@massalabs/massa-web3';
import { getClient, waitOp } from './utils';
import { PAIR_TO_BIN_STEP } from './dusa-utils';
import { increaseAllowanceIfNeeded } from './allowance';
import { config } from 'dotenv';
import { getAmountsToAdd } from './equilibrateBalances';
config();

const CHAIN_ID = ChainId.MAINNET;

const WMAS = _WMAS[CHAIN_ID];
const USDC = _USDC[CHAIN_ID];
const WETH = _WETH[CHAIN_ID];

const router = LB_ROUTER_ADDRESS[CHAIN_ID];

export async function addLiquidity(
  binStep: number,
  client: Client,
  account: IAccount,
  tokenAmountA: TokenAmount,
  tokenAmountB: TokenAmount,
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

  const addLiquidityInput = await pair.addLiquidityParameters(
    lbPair.LBPair,
    binStep,
    tokenAmountA,
    tokenAmountB,
    new Percent(BigInt(allowedAmountSlippage)),
    new Percent(BigInt(allowedPriceSlippage)),
    LiquidityDistribution.SPOT,
    client,
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
    pair.tokenA,
    tokenAmountA.raw,
  );
  await increaseAllowanceIfNeeded(
    client,
    account,
    pair.tokenB,
    tokenAmountB.raw,
  );

  // add liquidity
  console.log(
    `===== Adding liquidity: ${tokenAmountA.toSignificant(
      tokenAmountA.token.decimals,
    )} ${tokenAmountA.token.symbol} and ${tokenAmountB.toSignificant(
      tokenAmountB.token.decimals,
    )} ${tokenAmountB.token.symbol}`,
  );
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
    } else if (status === EOperationStatus.SPECULATIVE_ERROR) {
      console.error('Error adding liquidity: ', l);
    }
  });

  return { compositionFeeEvent, depositEvents };
}

async function main() {
  const { client, account } = await getClient(process.env.WALLET_SECRET_KEY!);

  // const pair = new PairV2(USDC, WMAS);
  // const binStep = PAIR_TO_BIN_STEP['WMAS-USDC'];

  const pair = new PairV2(WETH, WMAS);
  const binStep = PAIR_TO_BIN_STEP['WETH-WMAS'];
  console.log('token 0: ' + pair.tokenA.name);
  console.log('token 1: ' + pair.tokenB.name);

  const { amountA, amountB } = await getAmountsToAdd(client, account, pair);

  const { depositEvents } = await addLiquidity(
    binStep,
    client,
    account,
    amountA,
    amountB,
    pair,
  );
  depositEvents.map(console.log);
}

// await main();
